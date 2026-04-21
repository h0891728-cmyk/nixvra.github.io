'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { 
  upsertGlobalIntegrationAction, 
  toggleGlobalIntegrationAction, 
  deleteGlobalIntegrationAction 
} from '@/actions/integration-admin'

interface SecIntegration {
  id: string
  publicId: string
  provider: string
  isActive: boolean
  webhookUrl: string
  createdAt: string
  tenantId: string
  tenantName: string
  tenantDb: string
  apiKeyObscured: string
  accessTokenObscured: string
  refreshTokenObscured: string
  metadataStr: string
}

const PROVIDERS = [
  'META_GRAPH', 'WHATSAPP_CLOUD', 'YOUTUBE_DATA', 'CANVA', 
  'RAZORPAY', 'STRIPE', 'PRACTO', 'NINETY_NINE_ACRES', 
  'GOOGLE_ANALYTICS', 'MAILCHIMP', 'ZAPIER'
]

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

export default function IntegrationsManagerClient({ 
  integrations, 
  tenants,
  activeTenantId 
}: { 
  integrations: SecIntegration[]
  tenants: { id: string; name: string; databaseName: string }[]
  activeTenantId: string
}) {
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  // Form State
  const [targetTenantDb, setTargetTenantDb] = useState(activeTenantId === 'ALL' ? tenants[0]?.databaseName : tenants.find(t=>t.id===activeTenantId)?.databaseName || '')
  const [provider, setProvider] = useState(PROVIDERS[0])
  
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await upsertGlobalIntegrationAction(targetTenantDb, fd)
      setShowForm(false)
    })
  }

  async function handleToggle(tenantDb: string, p: string, current: boolean) {
    startTransition(async () => {
      await toggleGlobalIntegrationAction(tenantDb, p, !current)
    })
  }

  async function handleDelete(tenantDb: string, p: string) {
    if(!confirm(`Are you sure you want to permanently delete the ${p} connection for this tenant?`)) return
    startTransition(async () => {
      await deleteGlobalIntegrationAction(tenantDb, p)
    })
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
        <button 
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '0.625rem 1.25rem', borderRadius: 10,
            background: showForm ? 'var(--bg-raised)' : 'linear-gradient(135deg, #f97316, #f59e0b)',
            border: showForm ? '1px solid var(--border)' : 'none',
            color: showForm ? 'var(--text-primary)' : '#fff', 
            fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
            boxShadow: showForm ? 'none' : '0 4px 12px rgba(249, 115, 22, 0.3)',
          }}
        >
          {showForm ? '✕ Close Form' : '➕ Connect New API'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '1.5rem', marginBottom: '2rem',
          boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 1rem', color: 'var(--text-primary)' }}>Secure Connection Setup</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Enter details below. For security, keys are never sent completely back to the client once saved. Enter <code>****</code> in any field to preserve the existing value.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Target Tenant Network</label>
              <select 
                value={targetTenantDb} onChange={e => setTargetTenantDb(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: 8, background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
              >
                {tenants.map(t => <option key={t.id} value={t.databaseName}>{t.name}</option>)}
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Integration Provider</label>
              <select 
                name="provider" value={provider} onChange={e => setProvider(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: 8, background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
              >
                {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            {[
              { name: 'apiKey', label: 'API Key / Secret Key' },
              { name: 'accessToken', label: 'Access Token / Bearer' },
              { name: 'refreshToken', label: 'Refresh Token' },
              { name: 'webhookUrl', label: 'Webhook Callback URL' },
            ].map(f => (
              <div key={f.name}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{f.label}</label>
                <input 
                  name={f.name} type={f.name.includes('oken') || f.name.includes('Key') ? 'password' : 'text'}
                  placeholder="Optional..."
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 8, background: 'var(--bg-overlay)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none', fontFamily: 'monospace' }}
                />
              </div>
            ))}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Custom JSON Metadata</label>
            <textarea 
              name="metadata" placeholder='{"accountId": "123"}' rows={3}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 8, background: 'var(--bg-overlay)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none', fontFamily: 'monospace', resize: 'vertical' }}
            />
          </div>

          <button disabled={isPending} style={{
            marginTop: '1.5rem', width: '100%', padding: '0.875rem', borderRadius: 10,
            background: 'var(--text-primary)', color: 'var(--bg-base)', fontWeight: 800,
            border: 'none', cursor: isPending ? 'wait' : 'pointer', fontSize: '0.9375rem',
          }}>
            {isPending ? 'Connecting...' : 'Secure & Connect API'}
          </button>
        </form>
      )}

      {/* Grid of existing integrations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {integrations.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem', opacity: 0.5 }}>
              <path d="M18 6 6 18M7 6v4l-4 4 3 3 4-4h4l6-6-3-3z"/>
            </svg>
            <p style={{ fontSize: '1.125rem' }}>No integrations configured</p>
          </div>
        ) : (
          integrations.map(conn => {
            const info = PROVIDER_INFO[conn.provider] || { icon: 'settings', color: '#00B077' }
            return (
              <div key={conn.id} style={{
                background: 'var(--bg-raised)', border: `1px solid ${conn.isActive ? 'var(--border)' : 'rgba(244,63,94,0.3)'}`,
                borderRadius: 16, overflow: 'hidden', position: 'relative',
                opacity: conn.isActive ? 1 : 0.6, transition: 'opacity 200ms',
              }}>
                <div style={{ padding: '1.25rem 1.25rem 1rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${info.color}20, ${info.color}40)`, border: `1px solid ${info.color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: info.color, flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>{info.icon}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text-primary)' }}>{conn.provider}</h4>
                      <span style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem', borderRadius: 999, background: conn.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)', color: conn.isActive ? '#10b981' : '#f43f5e', fontWeight: 700 }}>
                        {conn.isActive ? 'ACTIVE' : 'PAUSED'}
                      </span>
                    </div>
                    <Link href={`/super-admin/tenants/${conn.tenantId}`} style={{ display: 'block', textDecoration: 'none', color: '#00B077', fontSize: '0.75rem', fontWeight: 600, marginTop: '0.25rem' }}>
                      {conn.tenantName} ({conn.tenantDb})
                    </Link>
                  </div>
                </div>

                <div style={{ padding: '0 1.25rem 1.25rem' }}>
                  <div style={{ background: 'var(--bg-overlay)', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--border)' }}>
                    {[
                      { label: 'API Key', val: conn.apiKeyObscured },
                      { label: 'Access Token', val: conn.accessTokenObscured },
                      { label: 'Webhook', val: conn.webhookUrl },
                    ].filter(x => !!x.val).map(f => (
                      <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.75rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{f.label}:</span>
                        <code style={{ color: '#818cf8', fontWeight: 600 }}>{f.val}</code>
                      </div>
                    ))}
                    {!conn.apiKeyObscured && !conn.accessTokenObscured && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>No tokens configured</p>
                    )}
                  </div>
                </div>

                <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem', background: 'var(--bg-surface)' }}>
                  <button onClick={() => {
                    setTargetTenantDb(conn.tenantDb)
                    setProvider(conn.provider)
                    setShowForm(true)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }} style={{ flex: 1, padding: '0.375rem', borderRadius: 6, background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                    Edit
                  </button>
                  <button onClick={() => handleToggle(conn.tenantDb, conn.provider, conn.isActive)} disabled={isPending} style={{ flex: 1, padding: '0.375rem', borderRadius: 6, background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                    {conn.isActive ? 'Pause' : 'Resume'}
                  </button>
                  <button onClick={() => handleDelete(conn.tenantDb, conn.provider)} disabled={isPending} style={{ padding: '0.375rem 0.625rem', borderRadius: 6, background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: '#f43f5e', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </>
  )
}
