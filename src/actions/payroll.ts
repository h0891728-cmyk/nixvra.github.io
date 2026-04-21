'use server'

import { masterDb, getTenantDb } from '@/lib/db'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'

/* ═══════════════════════════════════════════════════════════════
   INTERNAL HELPERS
   ═══════════════════════════════════════════════════════════════ */
async function assertSuperAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') throw new Error('Unauthorized')
  return session
}

async function getTenantSafe(tenantId: string) {
  const tenant = await masterDb.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, databaseName: true },
  })
  if (!tenant) throw new Error('Tenant not found')
  return tenant
}

async function writeAudit(
  databaseName: string,
  action: string,
  entityType: string,
  entityId: string,
  userId: string,
  details: any
) {
  try {
    const db = await getTenantDb(databaseName)
    await db.auditLog.create({
      data: { action, entityType, entityId, userId, details },
    })
  } catch (_) {}
}

/* ═══════════════════════════════════════════════════════════════
   1.  POLYMORPHIC PAYROLL RUNNER
       type = SALARY  → Staff/Teacher/Agent/Vendor payout
       type = FEES    → Student/Patient/Customer receivable invoices
       type = INVOICE → Vendor/Agent outgoing payables
   ═══════════════════════════════════════════════════════════════ */
export async function runTenantPayroll(
  tenantId: string,
  month: number,
  year: number,
  type: 'SALARY' | 'FEES' | 'INVOICE' = 'SALARY',
  useAttendance: boolean = false
) {
  const session = await assertSuperAdmin()
  const tenant = await getTenantSafe(tenantId)
  const db = await getTenantDb(tenant.databaseName)

  // Guard: prevent duplicate runs for the same cycle + type
  const existingRuns = await db.payrollRun.findMany({
    where: { month, year, deletedAt: null },
    select: { metadata: true },
  })
  const alreadyExists = existingRuns.some((r: any) => (r.metadata as any)?.type === type)
  if (alreadyExists) throw new Error(`${type} cycle for ${month}/${year} already exists.`)

  const run = await db.payrollRun.create({
    data: {
      month,
      year,
      totalAmount: 0,
      status: 'PROCESSING',
      processedBy: session.email,
      metadata: { type },
    },
  })

  let runTotal = 0
  let entityCount = 0

  /* ── SALARY mode ── */
  if (type === 'SALARY') {
    const payrollEntities = await db.businessEntity.findMany({
      where: {
        type: { in: ['STAFF', 'TEACHER', 'AGENT', 'VENDOR'] },
        deletedAt: null,
        coreValue: { gt: 0 },
      },
    })

    const taxes = await db.taxConfiguration.findMany({ where: { isActive: true } })
    const tdsConfig = taxes.find((t: any) => t.taxType === 'TDS')
    const pfConfig = taxes.find((t: any) => t.taxType === 'PF')
    const ptConfig = taxes.find((t: any) => t.taxType === 'PT')

    // Working days this month
    const workingDaysInMonth = new Date(year, month, 0).getDate()

    await Promise.all(
      payrollEntities.map(async (entity: any) => {
        const baseSalary = Number(entity.coreValue) || 0
        let effectiveSalary = baseSalary

        // Attendance-based proration
        if (useAttendance) {
          const startOfMonth = new Date(year, month - 1, 1)
          const endOfMonth = new Date(year, month, 0, 23, 59, 59)
          const logs = await db.attendanceLog.findMany({
            where: {
              entityId: entity.publicId,
              date: { gte: startOfMonth, lte: endOfMonth },
            },
            select: { status: true },
          })
          const daysPresent = logs.filter(
            (l: any) => l.status === 'PRESENT' || l.status === 'LATE'
          ).length
          const halfDays = logs.filter((l: any) => l.status === 'HALF_DAY').length
          const effectiveDays = daysPresent + halfDays * 0.5
          effectiveSalary =
            logs.length > 0
              ? (baseSalary / workingDaysInMonth) * effectiveDays
              : baseSalary
        }

        let deductions = 0
        if (tdsConfig && effectiveSalary > 30000)
          deductions += (effectiveSalary * tdsConfig.rate) / 100
        if (pfConfig) deductions += (effectiveSalary * pfConfig.rate) / 100
        if (ptConfig) deductions += ptConfig.rate // PT is flat amount

        const netPay = Math.max(0, effectiveSalary - deductions)
        runTotal += netPay
        entityCount++

        await db.salarySlip.create({
          data: {
            payrollRunId: run.publicId,
            businessEntityId: entity.publicId,
            baseSalary: effectiveSalary,
            allowances: 0,
            deductions,
            netPay,
            status: 'PENDING',
            metadata: {
              entityName: entity.name,
              entityType: entity.type,
              useAttendance,
              taxBreakdown: {
                tds: tdsConfig ? (effectiveSalary * tdsConfig.rate) / 100 : 0,
                pf: pfConfig ? (effectiveSalary * pfConfig.rate) / 100 : 0,
                pt: ptConfig ? ptConfig.rate : 0,
              },
            },
          },
        })
      })
    )
  }

  /* ── FEES mode (Receivables) ── */
  if (type === 'FEES') {
    const feeEntities = await db.businessEntity.findMany({
      where: {
        type: { in: ['STUDENT', 'PATIENT', 'CUSTOMER'] },
        deletedAt: null,
        coreValue: { gt: 0 },
      },
    })

    const startOfMonth = new Date(year, month - 1, 1)
    const dueDate = new Date(year, month - 1, 15) // Due 15th of month

    await Promise.all(
      feeEntities.map(async (entity: any) => {
        const feeAmount = Number(entity.coreValue) || 0
        const num = `FEE-${year}${String(month).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`

        await db.invoice.create({
          data: {
            businessEntityId: entity.publicId,
            amount: feeAmount,
            taxAmount: 0,
            status: 'PENDING',
            invoiceNumber: num,
            dueDate,
          },
        })

        runTotal += feeAmount
        entityCount++
      })
    )
  }

  /* ── INVOICE mode (Payables) ── */
  if (type === 'INVOICE') {
    const vendorEntities = await db.businessEntity.findMany({
      where: {
        type: { in: ['VENDOR', 'AGENT'] },
        deletedAt: null,
        coreValue: { gt: 0 },
      },
    })

    await Promise.all(
      vendorEntities.map(async (entity: any) => {
        const billAmount = Number(entity.coreValue) || 0
        const num = `INV-${year}${String(month).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`
        const dueDate = new Date(year, month, 0) // End of month

        await db.invoice.create({
          data: {
            businessEntityId: entity.publicId,
            amount: billAmount,
            taxAmount: 0,
            status: 'PENDING',
            invoiceNumber: num,
            dueDate,
          },
        })

        runTotal += billAmount
        entityCount++
      })
    )
  }

  await db.payrollRun.update({
    where: { id: run.id },
    data: {
      status: 'COMPLETED',
      totalAmount: runTotal,
      metadata: { type, entityCount },
    },
  })

  await writeAudit(tenant.databaseName, 'PAYROLL_RUN', 'PayrollRun', run.publicId, session.email, {
    month,
    year,
    type,
    entityCount,
    total: runTotal,
  })

  revalidatePath('/super-admin/payroll/master')
  revalidatePath('/dashboard/payroll')

  return { success: true, runId: run.publicId, totalProcessed: entityCount, totalAmount: runTotal }
}

/* ═══════════════════════════════════════════════════════════════
   2.  GET PAYROLL RUN HISTORY (for a tenant)
   ═══════════════════════════════════════════════════════════════ */
export async function getPayrollRuns(tenantId: string) {
  await assertSuperAdmin()
  const tenant = await getTenantSafe(tenantId)
  const db = await getTenantDb(tenant.databaseName)

  const runs = await db.payrollRun.findMany({
    where: { deletedAt: null },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  })

  // Count salary slips per run
  const runsWithCount = await Promise.all(
    runs.map(async (r: any) => {
      const count = await db.salarySlip.count({
        where: { payrollRunId: r.publicId, deletedAt: null },
      })
      return {
        id: String(r.id),
        publicId: r.publicId,
        month: r.month,
        year: r.year,
        totalAmount: r.totalAmount,
        status: r.status,
        processedBy: r.processedBy,
        metadata: r.metadata,
        createdAt: r.createdAt,
        entityCount: count,
      }
    })
  )

  return runsWithCount
}

/* ═══════════════════════════════════════════════════════════════
   3.  GET SALARY SLIPS FOR A PAYROLL RUN
   ═══════════════════════════════════════════════════════════════ */
export async function getSalarySlips(tenantId: string, payrollRunId: string) {
  await assertSuperAdmin()
  const tenant = await getTenantSafe(tenantId)
  const db = await getTenantDb(tenant.databaseName)

  const slips = await db.salarySlip.findMany({
    where: { payrollRunId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  })

  return slips.map((s: any) => ({
    id: String(s.id),
    publicId: s.publicId,
    businessEntityId: s.businessEntityId,
    entityName: (s.metadata as any)?.entityName ?? s.businessEntityId,
    entityType: (s.metadata as any)?.entityType ?? '—',
    baseSalary: s.baseSalary,
    allowances: s.allowances,
    deductions: s.deductions,
    netPay: s.netPay,
    status: s.status,
    taxBreakdown: (s.metadata as any)?.taxBreakdown ?? null,
    createdAt: s.createdAt,
  }))
}

/* ═══════════════════════════════════════════════════════════════
   4.  MARK SALARY SLIP AS PAID
   ═══════════════════════════════════════════════════════════════ */
export async function markSalaryPaid(tenantId: string, slipPublicId: string) {
  const session = await assertSuperAdmin()
  const tenant = await getTenantSafe(tenantId)
  const db = await getTenantDb(tenant.databaseName)

  await db.salarySlip.updateMany({
    where: { publicId: slipPublicId },
    data: { status: 'PAID' },
  })

  await writeAudit(tenant.databaseName, 'SALARY_MARKED_PAID', 'SalarySlip', slipPublicId, session.email, {})
  revalidatePath('/super-admin/payroll/master')
  return { success: true }
}

/* ═══════════════════════════════════════════════════════════════
   5.  CREATE INVOICE (ERP / Custom)
   ═══════════════════════════════════════════════════════════════ */
export async function createTenantInvoice(
  tenantId: string,
  payload: { businessEntityId: string; amount: number; dueDate?: string; taxAmount?: number; description?: string }
) {
  const session = await assertSuperAdmin()
  const tenant = await getTenantSafe(tenantId)
  const db = await getTenantDb(tenant.databaseName)

  const num = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`

  const inv = await db.invoice.create({
    data: {
      businessEntityId: payload.businessEntityId,
      amount: payload.amount,
      taxAmount: payload.taxAmount || 0,
      status: 'PENDING',
      invoiceNumber: num,
      dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
    },
  })

  await writeAudit(tenant.databaseName, 'INVOICE_CREATED', 'Invoice', inv.publicId, session.email, {
    num,
    amount: payload.amount,
  })

  revalidatePath('/super-admin/payroll/master')
  return { success: true, invoiceId: inv.publicId, invoiceNumber: num }
}

/* ═══════════════════════════════════════════════════════════════
   6.  GET INVOICE LIST (for a tenant)
   ═══════════════════════════════════════════════════════════════ */
export async function getInvoiceList(tenantId: string, statusFilter?: string) {
  await assertSuperAdmin()
  const tenant = await getTenantSafe(tenantId)
  const db = await getTenantDb(tenant.databaseName)

  const where: any = { deletedAt: null }
  if (statusFilter && statusFilter !== 'ALL') {
    where.status = statusFilter
  }

  const invoices = await db.invoice.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  // Enrich with entity names
  const entityIds = [...new Set(invoices.map((i: any) => i.businessEntityId))]
  const entities = await db.businessEntity.findMany({
    where: { publicId: { in: entityIds as string[] } },
    select: { publicId: true, name: true, type: true },
  })
  const entityMap = Object.fromEntries(entities.map((e: any) => [e.publicId, e]))

  return invoices.map((inv: any) => {
    const entity = entityMap[inv.businessEntityId]
    return {
      id: String(inv.id),
      publicId: inv.publicId,
      invoiceNumber: inv.invoiceNumber,
      businessEntityId: inv.businessEntityId,
      entityName: entity?.name ?? inv.businessEntityId,
      entityType: entity?.type ?? '—',
      amount: inv.amount,
      taxAmount: inv.taxAmount,
      status: inv.status,
      dueDate: inv.dueDate,
      createdAt: inv.createdAt,
    }
  })
}

/* ═══════════════════════════════════════════════════════════════
   7.  MARK INVOICE PAID / FAILED
   ═══════════════════════════════════════════════════════════════ */
export async function updateInvoiceStatus(
  tenantId: string,
  invoicePublicId: string,
  status: 'PAID' | 'FAILED' | 'REFUNDED'
) {
  const session = await assertSuperAdmin()
  const tenant = await getTenantSafe(tenantId)
  const db = await getTenantDb(tenant.databaseName)

  await db.invoice.updateMany({
    where: { publicId: invoicePublicId },
    data: { status },
  })

  await writeAudit(
    tenant.databaseName,
    'INVOICE_STATUS_UPDATED',
    'Invoice',
    invoicePublicId,
    session.email,
    { status }
  )

  revalidatePath('/super-admin/payroll/master')
  return { success: true }
}

/* ═══════════════════════════════════════════════════════════════
   8.  SET TAX CONFIG
   ═══════════════════════════════════════════════════════════════ */
export async function upsertTaxConfiguration(
  tenantId: string,
  taxType: string,
  rate: number,
  isActive: boolean
) {
  await assertSuperAdmin()
  const tenant = await getTenantSafe(tenantId)
  const db = await getTenantDb(tenant.databaseName)

  await db.taxConfiguration.upsert({
    where: { taxType },
    update: { rate, isActive },
    create: { taxType, rate, isActive },
  })

  revalidatePath('/super-admin/payroll/master')
  return true
}

/* ═══════════════════════════════════════════════════════════════
   9.  MASTER PAYROLL OVERVIEW (across ALL tenants)
   ═══════════════════════════════════════════════════════════════ */
export async function getMasterPayrollOverview() {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') throw new Error('Unauthorized')

  const tenants = await masterDb.tenant.findMany({
    select: { id: true, name: true, databaseName: true },
  })

  let totalPayrollValue = 0
  let totalInvoicesValue = 0
  let activePayrollRuns = 0

  const rows: { tenant: string; totalRuns: number; value: number; pendingInvoices: number }[] = []

  await Promise.all(
    tenants.map(async (t) => {
      try {
        const db = await getTenantDb(t.databaseName)
        const runs = await db.payrollRun.findMany({ where: { deletedAt: null } })
        const pendingInvs = await db.invoice.findMany({ where: { deletedAt: null, status: 'PENDING' } })

        const v = runs.reduce((acc: number, r: any) => acc + (Number(r.totalAmount) || 0), 0)
        const iv = pendingInvs.reduce((acc: number, r: any) => acc + (Number(r.amount) || 0), 0)

        totalPayrollValue += v
        totalInvoicesValue += iv
        activePayrollRuns += runs.length

        rows.push({ tenant: t.name, totalRuns: runs.length, value: v, pendingInvoices: pendingInvs.length })
      } catch (_) {}
    })
  )

  return { totalPayrollValue, totalInvoicesValue, activePayrollRuns, rows }
}

/* ═══════════════════════════════════════════════════════════════
   10.  LIST ALL TENANTS (for cross-tenant selector)
   ═══════════════════════════════════════════════════════════════ */
export async function getAllTenantsForPayroll() {
  await assertSuperAdmin()
  const tenants = await masterDb.tenant.findMany({
    select: { id: true, name: true, subdomain: true },
    orderBy: { name: 'asc' },
  })
  return tenants
}

/* ═══════════════════════════════════════════════════════════════
   11.  TOGGLE PAYMENT GATEWAY (STRIPE / RAZORPAY)
        Separate from PlatformType-constrained toggleIntegration
   ═══════════════════════════════════════════════════════════════ */
export async function togglePaymentGateway(tenantId: string, provider: string, isActive: boolean) {
  await assertSuperAdmin()
  const tenant = await getTenantSafe(tenantId)
  const db = await getTenantDb(tenant.databaseName)

  await db.tenantIntegration.updateMany({
    where: { provider: provider as never },
    data: { isActive },
  })

  revalidatePath('/super-admin/payroll/master')
  return { success: true }
}
