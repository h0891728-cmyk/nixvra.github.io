'use server'

import { masterDb, getTenantDb } from '@/lib/db'
import { getSession } from '@/lib/session'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'

// ── GET RECORDS ───────────────────────────────────────────────────────────────
export async function getTenantRecordsAction(typeFilter?: string) {
  const session = await getSession()
  if (!session || !session.tenantId) throw new Error('Unauthorized')

  const tenant = await masterDb.tenant.findUnique({ where: { id: session.tenantId } })
  if (!tenant) throw new Error('Tenant missing')

  const db = await getTenantDb(tenant.databaseName)

  const whereClause: any = { deletedAt: null }
  if (typeFilter) whereClause.type = typeFilter

  const records = await db.businessEntity.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' }
  })

  // Optionally fetch the `User` accounts attached to these profiles
  const userIds = records.map(e => e.userId).filter(Boolean) as string[]
  let attachedUsers: any[] = []
  if (userIds.length > 0) {
    attachedUsers = await db.user.findMany({
      where: { publicId: { in: userIds } },
      select: { publicId: true, email: true, role: true }
    })
  }

  return records.map(e => {
    const userAuth = attachedUsers.find(u => u.publicId === e.userId) || null

    // Keep return values serializable for client components/server actions.
    return {
      id: e.id,
      publicId: e.publicId,
      name: e.name,
      type: e.type,
      contact: e.contact ?? null,
      createdAt: e.createdAt.toISOString(),
      userAuth,
    }
  })
}

// ── CREATE RECORD (+ OPTIONAL AUTH LOGIN) ─────────────────────────────────────
export async function createTenantRecordAction(formData: FormData) {
  const session = await getSession()
  if (!session || !session.tenantId) throw new Error('Unauthorized')

  const tenant = await masterDb.tenant.findUnique({ where: { id: session.tenantId } })
  if (!tenant) throw new Error('Tenant config missing')

  const db = await getTenantDb(tenant.databaseName)

  const name = formData.get('name') as string
  const contact = formData.get('contact') as string
  const typeStr = formData.get('type') as string

  // Auth fields
  const createAuth = formData.get('createAuth') === 'true'
  const authEmail = formData.get('authEmail') as string
  const authPassword = formData.get('authPassword') as string

  if (!name || !typeStr) throw new Error('Missing required profile data')

  let assignedUserId: string | null = null

  // Issue 3 Fix: Passive profile types cannot have portal logins
  const PASSIVE_TYPES = ['STUDENT', 'PATIENT', 'PROPERTY', 'LEAD', 'GROUP', 'ASSET']
  if (PASSIVE_TYPES.includes(typeStr) && createAuth) {
    throw new Error(`${typeStr} profiles are managed objects and cannot have portal login accounts. Use PARENT or STAFF types for portal access.`)
  }

  // 1. Automatically provision User Login for active profile types if requested
  if (createAuth) {
    if (!authEmail || !authPassword) throw new Error('Email & Password required for Auth')

    const existing = await db.user.findUnique({ where: { email: authEmail } })
    if (existing) throw new Error('A user with that email already exists in this workspace')

    // Determine role — PARENT gets CUSTOMER portal role, staff types get STAFF
    let mappedRole: 'STAFF' | 'CUSTOMER' = 'CUSTOMER'
    if (['STAFF', 'TEACHER', 'AGENT', 'VENDOR'].includes(typeStr)) {
      mappedRole = 'STAFF'
    }

    const passwordHash = await bcrypt.hash(authPassword, 10)

    const newUser = await db.user.create({
      data: {
        email: authEmail.toLowerCase().trim(),
        role: mappedRole,
        passwordHash
      }
    })
    assignedUserId = newUser.publicId
  }

  // 2. Insert CRM Profile Entry
  await db.businessEntity.create({
    data: {
      type: typeStr as any,
      name: name.trim(),
      contact: contact ? contact.trim() : null,
      userId: assignedUserId
    }
  })

  revalidatePath('/dashboard/modules')
  return { success: true }
}

// ── DELETE RECORD ─────────────────────────────────────────────────────────────
export async function deleteTenantRecordAction(recordId: bigint) {
  const session = await getSession()
  if (!session || !session.tenantId) throw new Error('Unauthorized')

  const tenant = await masterDb.tenant.findUnique({ where: { id: session.tenantId } })
  if (!tenant) throw new Error('Tenant missing')

  const db = await getTenantDb(tenant.databaseName)

  const record = await db.businessEntity.findUnique({ where: { id: recordId } })
  if (!record) return

  // Hard delete record
  await db.businessEntity.delete({ where: { id: recordId } })

  // Also hard delete User if bound
  if (record.userId) {
    await db.user.deleteMany({ where: { publicId: record.userId } })
  }

  revalidatePath('/dashboard/modules')
}

// ── GET IMPORT TEMPLATE ───────────────────────────────────────────────────────
export async function getImportTemplateAction() {
  const session = await getSession()
  if (!session || !session.tenantId) throw new Error('Unauthorized')

  const tenant = await masterDb.tenant.findUnique({ where: { id: session.tenantId } })
  if (!tenant) throw new Error('Tenant missing')

  const headers = ['name', 'type', 'contact', 'coreTrait', 'coreValue', 'description']

  const examples: Record<string, string[]> = {
    EDUCATION: ['Aarav Sharma', 'STUDENT', 'aarav@example.com', 'Class', '5000', 'Fee-paying student'],
    REAL_ESTATE: ['Skyline Residency', 'PROPERTY', 'sales@example.com', 'Unit Type', '12500000', '3BHK premium inventory'],
    HEALTHCARE: ['Riya Mehta', 'PATIENT', '+919876543210', 'Treatment Plan', '12000', 'Follow-up consultation'],
    SERVICES: ['Acme Logistics', 'CUSTOMER', 'ops@acme.com', 'Retainer', '25000', 'Monthly managed-services account'],
    OTHER: ['Nixvra Demo Customer', 'CUSTOMER', 'demo@nixvra.online', 'Plan', '9999', 'Imported from sample CSV'],
  }

  return {
    headers,
    rows: [examples[tenant.industry] || examples.OTHER],
    filename: `nixvra_${tenant.industry.toLowerCase()}_example.csv`
  }
}

// ── BULK IMPORT RECORDS (CSV Engine) ──────────────────────────────────────────
export async function importRecordsBulkAction(parsedData: any[]) {
  const session = await getSession()
  if (!session || !session.tenantId) throw new Error('Unauthorized')

  const tenant = await masterDb.tenant.findUnique({ where: { id: session.tenantId } })
  if (!tenant) throw new Error('Tenant config missing')

  const db = await getTenantDb(tenant.databaseName)

  if (!parsedData || parsedData.length === 0) throw new Error('No data provided')

  const validTypes = ['STUDENT', 'PATIENT', 'LEAD', 'AGENT', 'CUSTOMER', 'VENDOR', 'STAFF', 'TEACHER', 'PARENT', 'PROPERTY', 'GROUP', 'ASSET']

  let successCount = 0
  let failedRows: any[] = []

  // We process in a single transaction for atomicity, OR use createMany for speed
  // Given we want to report errors per row, a loop or chunked createMany with validation is better
  const insertData = parsedData.map((row, index) => {
    try {
      if (!row.name) throw new Error('Missing name')

      return {
        type: (validTypes.includes(row.type?.toUpperCase()) ? row.type.toUpperCase() : 'CUSTOMER') as any,
        name: String(row.name).trim(),
        contact: row.contact ? String(row.contact).trim() : null,
        description: row.description ? String(row.description).trim() : null,
        coreTrait: row.coreTrait ? String(row.coreTrait).trim() : null,
        // Handle Decimal conversion safely
        coreValue: row.coreValue && !isNaN(Number(row.coreValue)) ? Number(row.coreValue) : null,
      }
    } catch (e: any) {
      failedRows.push({ index, error: e.message, data: row })
      return null
    }
  }).filter(Boolean) as any[]

  if (insertData.length > 0) {
    const result = await db.businessEntity.createMany({
      data: insertData,
      skipDuplicates: true
    })
    successCount = result.count
  }

  // Log to Audit Log
  await db.auditLog.create({
    data: {
      action: 'BULK_CSV_IMPORT',
      entityType: 'BusinessEntity',
      userId: session.email,
      details: {
        count: successCount,
        failedCount: failedRows.length,
        errors: failedRows.slice(0, 10) // report first 10 errors
      }
    }
  })

  revalidatePath('/dashboard/modules')

  return {
    success: true,
    count: successCount,
    failedCount: failedRows.length,
    errors: failedRows.length > 0 ? failedRows : null
  }
}
