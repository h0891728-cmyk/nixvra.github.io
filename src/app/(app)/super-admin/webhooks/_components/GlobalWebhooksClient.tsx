'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { getGlobalWebhookEvents } from '@/actions/super-admin-webhooks'
import PaginationControls from '@/components/ui/PaginationControls'

const SOURCE_ICONS: Record<string, { icon: string; color: string; label: string }> = {
  RAZORPAY: { icon: 'account_balance', color: '#3b82f6', label: 'Razorpay' },
  META_GRAPH: { icon: 'hub', color: '#06b6d4', label: 'Meta Graph' },
  WHATSAPP_CLOUD: { icon: 'forum', color: '#10b981', label: 'WhatsApp' },
  STRIPE: { icon: 'credit_card', color: '#00B077', label: 'Stripe' },
  SYSTEM: { icon: 'settings_system_daydream', color: '#008E60', label: 'System Action' },
  UNKNOWN: { icon: 'api', color: '#94a3b8', label: 'Unknown' },
}

const STATUS_PILL: Record<string, { bg: string; color: string; label: string }> = {
  PENDING:   { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b', label: 'Pending' },
  PROCESSED: { bg: 'rgba(16,185,129,0.12)',  color: '#10b981', label: 'Processed' },
  FAILED:    { bg: 'rgba(244,63,94,0.12)',   color: '#f43f5e', label: 'Failed' },
}

function StatusPill({ status }: { status: string }) {
  const pill = STATUS_PILL[status] || STATUS_PILL.PENDING
  return (
    <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: 999, background: pill.bg, color: pill.color, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
      {pill.label}
    </span>
  )
}

function TenantBadge({ tenant }: { tenant: { name: string; subdomain: string } }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-overlay)', padding: '0.2rem 0.5rem', borderRadius: 8, border: '1px solid var(--border)' }}>
      <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', color: '#00B077' }}>corporate_fare</span>
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{tenant.name}</span>
      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>({tenant.subdomain})</span>
    </div>
  )
}

export default function GlobalWebhooksClient() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getGlobalWebhookEvents()
    setEvents(data)
    setCurrentPage(1)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const totalPages = Math.max(1, Math.ceil(events.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedEvents = events.slice((safePage - 1) * pageSize, safePage * pageSize)

  return (
    <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.75rem', color: '#f59e0b' }}>webhook</span>
            Global Webhook Traffic
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
            Monitor incoming events hitting the system from external integrations across all isolated tenants.
          </p>
        </div>
        <button onClick={() => load()} disabled={loading} style={{ padding: '0.45rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>refresh</span>
        </button>
      </div>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Intercepting recent events...</div>
        ) : events.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>No webhook events recorded on the platform.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr)', gap: 1 }}>
            {paginatedEvents.map((e: any) => {
              const src = SOURCE_ICONS[e.source] || SOURCE_ICONS.UNKNOWN
              return (
                <div key={`${e.tenant.id}-${e.publicId}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1.25rem', background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: `${src.color}15`, color: src.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.3rem' }}>{src.icon}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)' }}>{src.label} Event</span>
                        <StatusPill status={e.status} />
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{new Date(e.createdAt).toLocaleString('en-IN')}</span>
                    </div>

                    <div style={{ marginBottom: '0.75rem' }}>
                      <TenantBadge tenant={e.tenant} />
                    </div>

                    <div style={{ background: 'var(--bg-overlay)', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--border)', overflowX: 'auto' }}>
                      <pre style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        {JSON.stringify(e.payload, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <PaginationControls
          currentPage={safePage}
          totalItems={events.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemLabel="events"
        />
      </div>
    </div>
  )
}
