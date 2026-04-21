'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { getTenantActivityLogs } from '@/actions/tenant-logs'

const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  WEBHOOK: { icon: 'api', color: '#06b6d4', label: 'Integration Webhook' },
  FINANCE: { icon: 'payments', color: '#10b981', label: 'Financial Tx' },
  AUDIT:   { icon: 'manage_accounts', color: '#f59e0b', label: 'System Action' }
}

const STATUS_PILL: Record<string, { bg: string; color: string }> = {
  PENDING:   { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b' },
  PROCESSED: { bg: 'rgba(16,185,129,0.12)',  color: '#10b981' },
  PAID:      { bg: 'rgba(16,185,129,0.12)',  color: '#10b981' },
  FAILED:    { bg: 'rgba(244,63,94,0.12)',   color: '#f43f5e' },
  INFO:      { bg: 'rgba(0,176,119,0.12)',  color: '#00B077' },
}

export default function TenantLogsClient() {
  const [feed, setFeed] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getTenantActivityLogs()
    setFeed(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.75rem', color: '#06b6d4' }}>pulse_alerts</span>
            Local Activity Stream
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
            Real-time local traces of webhooks, payments, and system operations inside your isolated environment.
          </p>
        </div>
        <button onClick={() => load()} disabled={loading} style={{ padding: '0.45rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>refresh</span>
        </button>
      </div>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Intercepting operational schema...</div>
        ) : feed.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>No local operational data recorded yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {feed.map((item: any, i) => {
              const conf = TYPE_CONFIG[item.type] || TYPE_CONFIG.AUDIT
              const pill = STATUS_PILL[item.status] || STATUS_PILL.INFO

              return (
                <div key={item.id} style={{ display: 'flex', gap: '1rem', padding: '1.25rem', borderBottom: i === feed.length - 1 ? 'none' : '1px solid var(--border)', background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-raised)' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: `${conf.color}15`, color: conf.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                     <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>{conf.icon}</span>
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)' }}>{item.action}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{new Date(item.timestamp).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                       <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: 6, background: pill.bg, color: pill.color, textTransform: 'uppercase' }}>
                         {item.status}
                       </span>
                       <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{conf.label}</span>
                    </div>

                    {item.details && (
                       <pre style={{ margin: 0, padding: '0.75rem', background: 'var(--bg-overlay)', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.6875rem', color: 'var(--text-secondary)', fontFamily: 'monospace', overflowX: 'auto' }}>
                         {JSON.stringify(item.details, null, 2)}
                       </pre>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
