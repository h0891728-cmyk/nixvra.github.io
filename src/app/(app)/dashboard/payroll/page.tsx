import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { masterDb, getTenantDb } from '@/lib/db'
import { requireModule } from '@/lib/modules'
import PayrollProcessor from '@/components/super-admin/payroll/PayrollProcessor'
import InvoiceListViewer from '@/components/super-admin/payroll/InvoiceListViewer'
import PayrollRunHistory from '@/components/super-admin/payroll/PayrollRunHistory'

export const metadata: Metadata = {
  title: 'Financial Dashboard — Payroll & Invoices',
}

export const dynamic = 'force-dynamic'

export default async function TenantPayrollDashboard() {
  const session = await getSession()
  if (!session) redirect('/login')

  // ── Module Guard: BILLING ────────────────────────────────────────────────
  await requireModule('BILLING')

  const tenant = await masterDb.tenant.findUnique({
    where: { id: session.tenantId },
    select: { id: true, name: true, subdomain: true, databaseName: true },
  })
  if (!tenant) redirect('/login')

  const db = await getTenantDb(tenant.databaseName)

  const entities = await db.businessEntity.findMany({
    where: { deletedAt: null },
    select: { publicId: true, name: true },
    orderBy: { name: 'asc' },
  })

  const recentSlips = await db.salarySlip.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div style={{ padding: '2rem' }}>
      <header style={{ marginBottom: '1.75rem' }}>
        <h1
          style={{
            fontSize: '1.375rem',
            fontWeight: 900,
            color: 'var(--text-primary)',
            margin: '0 0 0.4rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: '#10b981' }}>
            account_balance
          </span>
          Financial Dashboard
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', margin: 0 }}>
          Manage your organization&apos;s payroll, salary slips, and professional invoices.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '1.5rem', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Payroll Engine */}
          <PayrollProcessor tenantId={tenant.id} />

          {/* Invoice List + Create */}
          <InvoiceListViewer
            tenantId={tenant.id}
            entities={entities.map((e) => ({ id: e.publicId, name: e.name }))}
            tenantName={tenant.name}
            tenantSubdomain={tenant.subdomain}
          />

          {/* Payroll Run History + Salary Slips */}
          <PayrollRunHistory tenantId={tenant.id} tenantName={tenant.name} />
        </div>

        {/* Right side — Recent Salary Slips panel */}
        <div
          style={{
            background: 'var(--bg-surface)',
            padding: '1.5rem',
            borderRadius: 16,
            border: '1px solid var(--border)',
          }}
        >
          <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Recent Salary Slips
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {recentSlips.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'var(--text-muted)', display: 'block' }}>
                  inbox
                </span>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.5rem 0 0' }}>
                  No salary slips yet.
                </p>
              </div>
            ) : (
              recentSlips.map((s: any) => (
                <div
                  key={s.id.toString()}
                  style={{
                    padding: '1rem',
                    background: 'var(--bg-raised)',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                  }}
                >
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Net Pay
                  </p>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                    ₹{Number(s.netPay).toLocaleString()}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.6875rem',
                      color: 'var(--text-muted)',
                      marginTop: 6,
                    }}
                  >
                    <span>Base: ₹{Number(s.baseSalary).toLocaleString()}</span>
                    <span style={{ color: '#f43f5e' }}>Ded: ₹{Number(s.deductions).toLocaleString()}</span>
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.4rem',
                        borderRadius: 5,
                        background: s.status === 'PAID' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                        color: s.status === 'PAID' ? '#10b981' : '#f59e0b',
                      }}
                    >
                      {s.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
