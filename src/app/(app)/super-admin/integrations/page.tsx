import { masterDb, getTenantDb } from '@/lib/db'
import type { Metadata } from 'next'
import Link from 'next/link'
import TenantSelector from '../_components/TenantSelector'
import IntegrationsManagerClient from './_components/IntegrationsManagerClient'
import { GoogleModuleTable } from '@/components/integrations/GoogleModuleTable'

export const metadata: Metadata = { title: 'Integration Hub' }

const PROVIDER_INFO: Record<string, { label: string, icon: string, color: string }> = {
  META_GRAPH: { label: 'Meta Graph API', icon: 'all_inclusive', color: '#06b6d4' },
  WHATSAPP_CLOUD: { label: 'WhatsApp', icon: 'chat', color: '#10b981' },
  YOUTUBE_DATA: { label: 'YouTube Data', icon: 'play_circle', color: '#f43f5e' },
  CANVA: { label: 'Canva', icon: 'palette', color: '#0ea5e9' },
  RAZORPAY: { label: 'Razorpay', icon: 'payments', color: '#3b82f6' },
  STRIPE: { label: 'Stripe', icon: 'credit_card', color: '#00B077' },
  PRACTO: { label: 'Practo', icon: 'health_and_safety', color: '#008E60' },
  NINETY_NINE_ACRES: { label: '99 Acres', icon: 'domain', color: '#f59e0b' },
  GOOGLE_ANALYTICS: { label: 'Analytics', icon: 'bar_chart', color: '#f59e0b' },
  MAILCHIMP: { label: 'Mailchimp', icon: 'mail', color: '#eab308' },
  ZAPIER: { label: 'Zapier', icon: 'bolt', color: '#f97316' },
}

// Obfuscate secret for frontend delivery
function obfuscate(secret: string | null) {
  if (!secret) return ''
  if (secret.length <= 8) return '****'
  return secret.substring(0, 4) + '*'.repeat(secret.length - 8) + secret.substring(secret.length - 4)
}

export default async function GlobalIntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tenantId?: string }>
}) {
  const { tenantId = 'ALL' } = await searchParams

  const tenants = await masterDb.tenant.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, subdomain: true, databaseName: true, googleIntegration: true }
  })
  
  const googleTenantsData = tenants.map(t => ({
    tenantId: t.id,
    tenantName: t.name,
    isConnected: !!t.googleIntegration,
    connectedEmail: t.googleIntegration?.email || null,
    lastSync: t.googleIntegration?.updatedAt?.toLocaleDateString() || null
  }))

  let rawIntegrations: any[] = []
  
  if (tenantId === 'ALL') {
    // ── Hybrid Aggregation (Cross-Database) ──
    const targetTenants = tenants.slice(0, 15) // Check top 15 tenants
    
    const results = await Promise.allSettled(
      targetTenants.map(async t => {
        const db = await getTenantDb(t.databaseName)
        const ints = await db.tenantIntegration.findMany({
          orderBy: { createdAt: 'desc' },
        })
        return ints.map((i: any) => ({
          ...i,
          id: i.id.toString(),
          tenantId: t.id,
          tenantName: t.name,
          tenantDb: t.databaseName,
        }))
      })
    )

    results.forEach(res => {
      if (res.status === 'fulfilled') {
        rawIntegrations.push(...res.value)
      }
    })
    
    rawIntegrations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    
  } else {
    // ── Single Tenant Mode ──
    const tenant = tenants.find(t => t.id === tenantId)
    if (tenant) {
      const db = await getTenantDb(tenant.databaseName)
      const ints = await db.tenantIntegration.findMany({
        orderBy: { createdAt: 'desc' },
      })
      rawIntegrations = ints.map((i: any) => ({
        ...i,
        id: i.id.toString(),
        tenantId: tenant.id,
        tenantName: tenant.name,
        tenantDb: tenant.databaseName,
      }))
    }
  }

  // Securely Obfuscate Keys before sending to client
  const secureIntegrations = rawIntegrations.map(i => ({
    id: i.id,
    publicId: i.publicId,
    provider: i.provider,
    isActive: i.isActive,
    webhookUrl: i.webhookUrl || '',
    createdAt: i.createdAt.toISOString(),
    tenantId: i.tenantId,
    tenantName: i.tenantName,
    tenantDb: i.tenantDb,
    apiKeyObscured: obfuscate(i.apiKey),
    accessTokenObscured: obfuscate(i.accessToken),
    refreshTokenObscured: obfuscate(i.refreshToken),
    metadataStr: i.metadata ? JSON.stringify(i.metadata, null, 2) : '',
  }))

  const providerCounts: Record<string, number> = {}
  secureIntegrations.forEach(i => {
    providerCounts[i.provider] = (providerCounts[i.provider] || 0) + 1
  })

  return (
    <>
      <header className="os-topbar">
        <div>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#008E60' }}>
              <path d="M18 6 6 18M7 6v4l-4 4 3 3 4-4h4l6-6-3-3z"/>
            </svg>
            Integration Hub
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
            Manage and securely configure third-party APIs across tenants
          </p>
        </div>
        
        {/* Master Panel Link + Tenant Selector */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link
            href="/super-admin/integrations/master"
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '0.5rem 1rem', borderRadius: 8, textDecoration: 'none',
              background: 'linear-gradient(135deg,#00B077,#008E60)', color: '#fff',
              fontSize: '0.8125rem', fontWeight: 700, whiteSpace: 'nowrap',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>hub</span>
            Master Panel
          </Link>
          <TenantSelector tenants={tenants} defaultValue={tenantId} />
        </div>
      </header>

      <div className="os-content">
        {/* Top Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ padding: '1.25rem', borderRadius: 14, background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.25rem' }}>Active Connections</p>
            <p style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>{secureIntegrations.length}</p>
          </div>
          {Object.entries(providerCounts).slice(0, 5).map(([p, c]) => {
            const info = PROVIDER_INFO[p] || { icon: 'settings', color: '#00B077' }
            return (
              <div key={p} style={{ 
                padding: '1.25rem', borderRadius: 14, background: 'var(--bg-surface)', 
                border: '1px solid var(--border)', borderTop: `3px solid ${info.color}`
              }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: info.color }}>{info.icon}</span>
                  {info.label || p}
                </p>
                <p style={{ fontSize: '1.5rem', fontWeight: 900, color: info.color, margin: 0, lineHeight: 1 }}>{c}</p>
              </div>
            )
          })}
        </div>

        <IntegrationsManagerClient 
          integrations={secureIntegrations}
          tenants={tenants}
          activeTenantId={tenantId}
        />

        <div style={{ marginTop: '2rem' }}>
          <GoogleModuleTable tenants={googleTenantsData} />
        </div>

      </div>
    </>
  )
}
