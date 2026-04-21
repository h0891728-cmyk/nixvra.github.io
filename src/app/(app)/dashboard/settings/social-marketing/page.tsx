import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { getUserProfileAction } from '@/actions/user-profile'
import SocialMarketingSettingsClient from './_components/SocialMarketingSettingsClient'

export const dynamic = 'force-dynamic'

export default async function SocialMarketingSettingsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const profile = await getUserProfileAction()
  if (!profile) redirect('/login')

  const isAdmin = session.role === 'TENANT_ADMIN' || session.role === 'SUPER_ADMIN'

  return (
    <div style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>
      <header style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ color: '#00B077', fontSize: '1.4rem' }}>campaign</span>
            Social & Marketing Panel
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
            Manage your connected channels and marketing access for this workspace.
          </p>
        </div>
        <Link
          href="/dashboard/settings"
          style={{
            textDecoration: 'none',
            padding: '0.55rem 0.9rem',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            fontWeight: 800,
            fontSize: '0.8125rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            flexShrink: 0,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.05rem', color: 'var(--text-muted)' }}>arrow_back</span>
          Settings Home
        </Link>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <SocialMarketingSettingsClient
          tenantId={profile.tenant.id}
          isAdmin={isAdmin}
          google={profile.google}
          entitledModules={profile.tenant.entitledModules}
          services={profile.tenant.services}
        />
      </div>
    </div>
  )
}
