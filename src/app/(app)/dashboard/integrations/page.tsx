import { getSession } from '@/lib/session'
import { masterDb } from '@/lib/db'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import TenantIntegrationsClient from './_components/TenantIntegrationsClient'

export const metadata: Metadata = {
  title: 'App Marketplace - Integrations',
  description: 'Connect YouTube, X, LinkedIn, Gmail, SMTP, IVRS and more to your workspace.',
}

export default async function TenantIntegrationsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const tenant = await masterDb.tenant.findUnique({
    where: { id: session.tenantId },
    select: { id: true, name: true, subdomain: true, databaseName: true, googleIntegration: true },
  })
  if (!tenant) redirect('/login')

  return (
    <div style={{ padding: '2rem' }}>
      <header style={{ marginBottom: '1.75rem' }}>
        <h1 style={{
          fontSize: '1.375rem', fontWeight: 900, color: 'var(--text-primary)',
          margin: '0 0 0.4rem', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: '#00B077' }}>
            hub
          </span>
          App Marketplace
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', margin: 0 }}>
          Connect external services to <strong style={{ color: 'var(--text-primary)' }}>{tenant.name}</strong> - YouTube, X, LinkedIn, Gmail, SMTP, IVRS, and more.
        </p>
      </header>

      <TenantIntegrationsClient 
        tenantId={tenant.id} 
        tenantName={tenant.name} 
        googleIsConnected={!!(tenant as any).googleIntegration}
        googleEmail={(tenant as any).googleIntegration?.email}
      />
    </div>
  )
}
