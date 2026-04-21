'use client'

import React, { useState, useEffect, useCallback, useTransition } from 'react'
import { getTenantIntegrations, type TenantPlatformStatus } from '@/actions/master-integrations'
import IntegrationCard, { PLATFORM_META } from '@/components/super-admin/integrations/IntegrationCard'
import { GoogleBusinessCard } from '@/components/integrations/GoogleBusinessCard'

const ALL_PLATFORMS = [
  'META_GRAPH', 'WHATSAPP_CLOUD',
  'YOUTUBE_DATA', 'TWITTER', 'LINKEDIN',
  'SMTP', 'GMAIL',
  'IVRS',
]

const CATEGORIES = [
  { key: 'all',       label: 'All Platforms',  icon: 'apps' },
  { key: 'social',    label: 'Social Media',   icon: 'share' },
  { key: 'email',     label: 'Email',          icon: 'mail' },
  { key: 'telephony', label: 'Telephony',      icon: 'call' },
]

const CATEGORY_MAP: Record<string, string[]> = {
  social:    ['META_GRAPH', 'WHATSAPP_CLOUD', 'YOUTUBE_DATA', 'TWITTER', 'LINKEDIN'],
  email:     ['SMTP', 'GMAIL', 'MAILCHIMP'],
  telephony: ['IVRS'],
}

type Props = {
  tenantId: string
  tenantName: string
  googleIsConnected?: boolean
  googleEmail?: string
}

export default function TenantIntegrationsClient({ tenantId, tenantName, googleIsConnected, googleEmail }: Props) {
  const [rows, setRows]               = useState<TenantPlatformStatus[]>([])
  const [loading, setLoading]         = useState(true)
  const [activeCategory, setCategory] = useState('all')
  const [, startTransition]           = useTransition()

  const load = useCallback(() => {
    startTransition(async () => {
      setLoading(true)
      try {
        const data = await getTenantIntegrations(tenantId)
        setRows(data)
      } catch (_) {}
      setLoading(false)
    })
  }, [tenantId])

  useEffect(() => { load() }, [load])

  const connectedMap = new Map(rows.map(r => [r.provider, r]))

  const visiblePlatforms = ALL_PLATFORMS.filter(p =>
    activeCategory === 'all' ? true : (CATEGORY_MAP[activeCategory] || []).includes(p)
  )

  const connectedCount = rows.filter(r => r.isActive).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Stats Bar */}
      <div style={{
        display: 'flex', gap: '1rem', flexWrap: 'wrap',
        padding: '1rem 1.25rem', background: 'var(--bg-surface)',
        border: '1px solid var(--border)', borderRadius: 14,
        alignItems: 'center',
      }}>
        <div>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 0.15rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Connected</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981', margin: 0, lineHeight: 1 }}>{connectedCount}</p>
        </div>
        <div style={{ width: 1, height: 36, background: 'var(--border)' }} />
        <div>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 0.15rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Available</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>{ALL_PLATFORMS.length}</p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={load}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '0.45rem 0.875rem', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--bg-raised)',
              color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div style={{
        display: 'flex', gap: '0.25rem', background: 'var(--bg-raised)',
        padding: '0.3rem', borderRadius: 12, border: '1px solid var(--border)',
      }}>
        {CATEGORIES.map(c => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '0.45rem 0.875rem', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.8125rem', transition: 'all 200ms',
              background: activeCategory === c.key ? 'var(--bg-surface)' : 'transparent',
              color: activeCategory === c.key ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: activeCategory === c.key ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>{c.icon}</span>
            {c.label}
          </button>
        ))}
      </div>

      {/* Platform Grid */}
      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading integrations...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.875rem' }}>
          {visiblePlatforms.map(provider => {
            const row = connectedMap.get(provider)
            return (
              <IntegrationCard
                key={provider}
                provider={provider}
                tenantId={tenantId}
                tenantName={tenantName}
                isConnected={!!row && row.isActive}
                isActive={row?.isActive ?? false}
                connectedAt={row?.connectedAt ?? null}
                onRefresh={load}
              />
            )
          })}
          {visiblePlatforms.length === 0 && (
            <p style={{ color: 'var(--text-muted)', gridColumn: '1/-1' }}>No platforms in this category.</p>
          )}
        </div>
      )}

      {/* Google Business Module Injection */}
      <div style={{ marginTop: '1rem' }}>
        <GoogleBusinessCard 
          isConnected={!!googleIsConnected} 
          connectedEmail={googleEmail}
          targetTenantId={tenantId} 
        />
      </div>

      {/* Help Box */}
      <div style={{
        padding: '1rem 1.25rem', background: 'rgba(0,176,119,0.06)',
        border: '1px solid rgba(0,176,119,0.15)', borderRadius: 12,
        fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6,
      }}>
        <strong style={{ color: '#00B077' }}>Security Note:</strong> All credentials are stored securely in <strong>{tenantName}</strong>&apos;s isolated database. Secrets are never exposed on the frontend — only connection status is visible after saving.
      </div>
    </div>
  )
}
