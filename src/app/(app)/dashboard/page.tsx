import { getSession } from '@/lib/session'
import { masterDb } from '@/lib/db'
import { redirect } from 'next/navigation'
import TenantOverviewClient from './_components/TenantOverviewClient'
import { getEffectiveModules } from '@/lib/modules'

export const dynamic = 'force-dynamic'

export default async function TenantDashboardHome({
  searchParams,
}: {
  searchParams: Promise<{ blocked?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { blocked } = await searchParams

  const tenant = await masterDb.tenant.findUnique({
    where: { id: session.tenantId },
    select: { id: true, name: true, industry: true, modules: true, services: true },
  })

  if (!tenant) return null

  const entitledModules = (tenant.modules as string[]) ?? []
  const services = tenant.services as Record<string, boolean> | null
  const activeModules = getEffectiveModules(entitledModules, services)

  return (
    <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
      {/* ── Module Access Denied Banner ── */}
      {blocked === 'true' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.875rem',
          padding: '1rem 1.25rem', marginBottom: '1.5rem',
          background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)',
          borderRadius: 12,
        }}>
          <span className="material-symbols-outlined" style={{ color: '#f43f5e', fontSize: '1.25rem', flexShrink: 0 }}>
            lock
          </span>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9375rem', color: '#f43f5e' }}>
              Module Access Restricted
            </p>
            <p style={{ margin: '0.1rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              That feature is not enabled for your workspace. Contact your Super Admin to unlock it.
            </p>
          </div>
          {activeModules.length > 0 && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.25rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {activeModules.map(m => (
                <span key={m} style={{
                  fontSize: '0.625rem', fontWeight: 700, padding: '0.15rem 0.4rem',
                  background: 'rgba(0,176,119,0.15)', color: '#00B077', borderRadius: 4,
                }}>{m}</span>
              ))}
            </div>
          )}
        </div>
      )}

      <TenantOverviewClient
        tenantName={tenant.name}
        industry={tenant.industry}
        activeModules={activeModules}
        services={services ?? {}}
      />
    </div>
  )
}
