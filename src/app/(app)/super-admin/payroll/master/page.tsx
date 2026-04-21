import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { masterDb, getTenantDb } from '@/lib/db'
import MasterPayrollHub from '@/components/super-admin/payroll/MasterPayrollHub'
import { getMasterPayrollOverview } from '@/actions/payroll'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Master Payroll & Finance — Nixvra',
  description: 'Global Financial Command Center — Payroll, Invoices, Tax & Gateways',
}

export default async function MasterPayrollPage() {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') redirect('/login')

  // Load HQ tenant (prefer 'omnicore' subdomain, fallback to oldest)
  const hqTenant =
    (await masterDb.tenant.findFirst({ where: { subdomain: 'omnicore' } })) ??
    (await masterDb.tenant.findFirst({ orderBy: { createdAt: 'asc' } }))

  if (!hqTenant) redirect('/super-admin')

  // Load ALL tenants for cross-tenant selector
  const allTenants = await masterDb.tenant.findMany({
    select: { id: true, name: true, subdomain: true },
    orderBy: { name: 'asc' },
  })

  // HQ tenant DB — fetch entities, taxes, gateways from HQ db
  const db = await getTenantDb(hqTenant.databaseName)

  const [entities, taxes, gateways] = await Promise.all([
    db.businessEntity.findMany({
      where: { deletedAt: null },
      select: { publicId: true, name: true },
      orderBy: { name: 'asc' },
    }),
    db.taxConfiguration.findMany(),
    db.tenantIntegration.findMany({
      where: { provider: { in: ['STRIPE', 'RAZORPAY'] } },
    }),
  ])

  // Global payroll overview (cross-tenant)
  const globalData = await getMasterPayrollOverview()

  return (
    <>
      <header className="os-topbar">
        <div>
          <h1
            style={{
              fontSize: '1.125rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '1.35rem', color: '#10b981' }}
            >
              request_quote
            </span>
            Master Payroll &amp; Finance
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
            Central processor for automated payslips, ERP invoices and gateway disbursements across{' '}
            {allTenants.length} tenant{allTenants.length !== 1 ? 's' : ''}.
          </p>
        </div>
      </header>
      <div className="os-content">
        <MasterPayrollHub
          hqTenantId={hqTenant.id}
          hqTenantName={hqTenant.name}
          hqEntities={entities.map((e) => ({ id: e.publicId, name: e.name }))}
          hqTaxes={taxes.map((t) => ({ taxType: t.taxType, rate: t.rate, isActive: t.isActive }))}
          hqGateways={gateways.map((g) => ({
            provider: g.provider,
            isActive: g.isActive,
            hasKey: !!(g.apiKey || g.accessToken),
          }))}
          tenants={allTenants}
          globalData={globalData}
        />
      </div>
    </>
  )
}
