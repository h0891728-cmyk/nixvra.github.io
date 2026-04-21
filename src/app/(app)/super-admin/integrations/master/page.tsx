import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { masterDb } from '@/lib/db'
import MasterIntegrationsHub from '@/components/super-admin/integrations/MasterIntegrationsHub'
import { GoogleBusinessCard } from '@/components/integrations/GoogleBusinessCard'

export const metadata: Metadata = {
  title: 'Master Integrations Panel — Nixvra',
  description: 'Central command center for all external platform connections across every tenant.',
}

export default async function MasterIntegrationsPage() {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') redirect('/login')

  // Find the HQ tenant (the omnicore_hq database)
  const hqTenant = await masterDb.tenant.findFirst({
    where: { subdomain: 'omnicore' },
    include: { googleIntegration: true },
  }) ?? await masterDb.tenant.findFirst({
    orderBy: { createdAt: 'asc' },
    include: { googleIntegration: true },
  })

  if (!hqTenant) redirect('/super-admin')

  return (
    <>
      <header className="os-topbar">
        <div>
          <h1 style={{
            fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)',
            margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.35rem', color: '#00B077' }}>
              hub
            </span>
            Master Integrations Panel
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
            Central command center — manage all external connections across every tenant from one place
          </p>
        </div>

        {/* Link back to legacy hub */}
        <Link
          href="/super-admin/integrations"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: '0.8125rem', fontWeight: 600,
            color: 'var(--text-muted)', textDecoration: 'none',
            padding: '0.45rem 0.875rem', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--bg-raised)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>arrow_back</span>
          Integration Hub
        </Link>
      </header>

      <div className="os-content">
        <div style={{ marginBottom: '1.5rem' }}>
          <GoogleBusinessCard 
            isConnected={!!hqTenant.googleIntegration}
            connectedEmail={hqTenant.googleIntegration?.email ?? undefined}
            targetTenantId={hqTenant.id}
          />
        </div>
        <MasterIntegrationsHub hqTenantId={hqTenant.id} />
      </div>
    </>
  )
}
