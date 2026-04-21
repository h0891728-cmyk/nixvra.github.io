'use client'

import React, { useState, useTransition, useCallback, useEffect } from 'react'
import {
  listAllIntegrations, getGlobalIntegrationSummary,
  type TenantIntegrationSummary, type PlatformSummary,
} from '@/actions/master-integrations'
import IntegrationCard, { PLATFORM_META } from '@/components/super-admin/integrations/IntegrationCard'
import TenantConnectionTable from '@/components/super-admin/integrations/TenantConnectionTable'

type Tab = 'overview' | 'social' | 'email' | 'telephony' | 'tenants'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'overview',   label: 'Overview',    icon: 'dashboard' },
  { key: 'social',     label: 'Social Media', icon: 'share' },
  { key: 'email',      label: 'Email',        icon: 'mail' },
  { key: 'telephony',  label: 'Telephony',    icon: 'call' },
  { key: 'tenants',    label: 'All Tenants',  icon: 'corporate_fare' },
]

const SOCIAL_PROVIDERS    = ['META_GRAPH', 'WHATSAPP_CLOUD', 'YOUTUBE_DATA', 'TWITTER', 'LINKEDIN']
const EMAIL_PROVIDERS     = ['SMTP', 'GMAIL', 'MAILCHIMP']
const TELEPHONY_PROVIDERS = ['IVRS']

interface Props {
  hqTenantId: string
}

/* ═══════════════════════════════════════════════════════════════
   MASTER INTEGRATIONS HUB
   ═══════════════════════════════════════════════════════════════ */
export default function MasterIntegrationsHub({ hqTenantId }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [allIntegrations, setAllIntegrations] = useState<TenantIntegrationSummary[]>([])
  const [summary, setSummary] = useState<PlatformSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [, startTransition] = useTransition()

  const load = useCallback(() => {
    startTransition(async () => {
      setLoading(true)
      try {
        const [ints, sum] = await Promise.all([listAllIntegrations(), getGlobalIntegrationSummary()])
        setAllIntegrations(ints)
        setSummary(sum)
      } catch (_) {}
      setLoading(false)
    })
  }, [])

  useEffect(() => { load() }, [load])

  /* ── helpers ── */
  function getStatusFor(provider: string): { isConnected: boolean; isActive: boolean; connectedAt: string | null } {
    // For HQ tenant view in card grids
    const hqRow = allIntegrations.find(r => r.provider === provider && r.tenantId === hqTenantId)
    if (hqRow) return { isConnected: true, isActive: hqRow.isActive, connectedAt: hqRow.connectedAt }
    return { isConnected: false, isActive: false, connectedAt: null }
  }

  const totalActive   = allIntegrations.filter(r => r.isActive).length
  const totalInactive = allIntegrations.filter(r => !r.isActive).length
  const uniquePlatforms = new Set(allIntegrations.map(r => r.provider)).size

  /* ── KPI cards ── */
  const kpis = [
    { label: 'Total Connections', value: allIntegrations.length, icon: 'link',            color: '#00B077' },
    { label: 'Active Now',        value: totalActive,             icon: 'check_circle',    color: '#10b981' },
    { label: 'Inactive',          value: totalInactive,           icon: 'warning',         color: '#f59e0b' },
    { label: 'Platforms Used',    value: uniquePlatforms,         icon: 'apps',            color: '#06b6d4' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── Tab Nav ── */}
      <div style={{
        display: 'flex', gap: '0.25rem', background: 'var(--bg-raised)',
        padding: '0.3rem', borderRadius: 12, border: '1px solid var(--border)',
        overflowX: 'auto', flexWrap: 'nowrap',
      }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '0.5rem 1rem', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.8125rem', transition: 'all 200ms', whiteSpace: 'nowrap',
              background: activeTab === t.key ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: activeTab === t.key ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={load}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '0.45rem 0.875rem', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--bg-overlay)', color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>refresh</span>
          Refresh
        </button>
      </div>

      {loading && (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading integrations...
        </div>
      )}

      {/* ─────────────────── OVERVIEW TAB ─────────────────── */}
      {!loading && activeTab === 'overview' && (
        <>
          {/* KPI Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.875rem' }}>
            {kpis.map(k => (
              <div key={k.label} style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                borderRadius: 14, padding: '1.25rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</p>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: k.color }}>{k.icon}</span>
                </div>
                <p style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Platform Summary Grid */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
            <p style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--text-primary)', margin: '0 0 1rem' }}>
              Platform Coverage — Network Wide
            </p>
            {summary.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No integrations connected yet.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                {summary.map(s => {
                  const pm = PLATFORM_META[s.provider]
                  const pct = s.totalConnected > 0 ? Math.round((s.totalActive / s.totalConnected) * 100) : 0
                  return (
                    <div key={s.provider} style={{
                      background: 'var(--bg-raised)', borderRadius: 12,
                      border: `1px solid ${pm?.color || '#00B077'}20`,
                      padding: '1rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.5rem' }}>
                        <span style={{
                          width: 28, height: 28, borderRadius: 7,
                          background: `${pm?.color || '#00B077'}18`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.875rem', fontWeight: 900, color: pm?.color || '#00B077',
                        }}>{pm?.icon || '⚙'}</span>
                        <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{pm?.label || s.provider}</span>
                      </div>
                      <p style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>
                        {s.totalActive}<span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>/{s.totalConnected}</span>
                      </p>
                      <div style={{ height: 4, background: 'var(--bg-overlay)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: pm?.color || '#00B077', borderRadius: 2 }} />
                      </div>
                      <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>{pct}% active · {s.totalConnected} tenant{s.totalConnected !== 1 ? 's' : ''}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* HQ Quick Connect shortcut */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <p style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--text-primary)', margin: 0 }}>HQ Connections (Nixvra)</p>
              <button onClick={() => setActiveTab('social')} style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#00B077', background: 'none', border: 'none', cursor: 'pointer' }}>
                View All →
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
              {['YOUTUBE_DATA', 'TWITTER', 'LINKEDIN', 'SMTP', 'GMAIL', 'IVRS'].map(p => {
                const { isConnected, isActive, connectedAt } = getStatusFor(p)
                return (
                  <IntegrationCard
                    key={p}
                    provider={p}
                    tenantId={hqTenantId}
                    tenantName="Nixvra HQ"
                    isConnected={isConnected}
                    isActive={isActive}
                    connectedAt={connectedAt}
                    compact
                    onRefresh={load}
                  />
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* ─────────────────── SOCIAL MEDIA TAB ─────────────────── */}
      {!loading && activeTab === 'social' && (
        <PlatformTabPanel
          title="Social Media Platforms"
          description="Connect YouTube, X (Twitter), LinkedIn, Meta, and WhatsApp across HQ and all tenants."
          providers={SOCIAL_PROVIDERS}
          hqTenantId={hqTenantId}
          allIntegrations={allIntegrations}
          onRefresh={load}
        />
      )}

      {/* ─────────────────── EMAIL TAB ─────────────────── */}
      {!loading && activeTab === 'email' && (
        <PlatformTabPanel
          title="Email Delivery"
          description="Configure SMTP, Gmail OAuth2, or Mailchimp for transactional and marketing emails."
          providers={EMAIL_PROVIDERS}
          hqTenantId={hqTenantId}
          allIntegrations={allIntegrations}
          onRefresh={load}
        />
      )}

      {/* ─────────────────── TELEPHONY TAB ─────────────────── */}
      {!loading && activeTab === 'telephony' && (
        <PlatformTabPanel
          title="Telephony & IVRS"
          description="Connect IVRS providers (Twilio, Exotel, Knowlarity, MyOperator) for automated call flows."
          providers={TELEPHONY_PROVIDERS}
          hqTenantId={hqTenantId}
          allIntegrations={allIntegrations}
          onRefresh={load}
        />
      )}

      {/* ─────────────────── ALL TENANTS TAB ─────────────────── */}
      {!loading && activeTab === 'tenants' && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
          <p style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--text-primary)', margin: '0 0 1rem' }}>
            All Tenant Connections — {allIntegrations.length} total
          </p>
          <TenantConnectionTable integrations={allIntegrations} />
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   PlatformTabPanel — Shared layout for Social / Email / Telephony
   ═══════════════════════════════════════════════════════════════ */
function PlatformTabPanel({
  title, description, providers, hqTenantId, allIntegrations, onRefresh,
}: {
  title: string
  description: string
  providers: string[]
  hqTenantId: string
  allIntegrations: TenantIntegrationSummary[]
  onRefresh: () => void
}) {
  function getStatusFor(provider: string) {
    const hqRow = allIntegrations.find(r => r.provider === provider && r.tenantId === hqTenantId)
    if (hqRow) return { isConnected: true, isActive: hqRow.isActive, connectedAt: hqRow.connectedAt }
    return { isConnected: false, isActive: false, connectedAt: null }
  }

  const existingProviders = providers.filter(p => PLATFORM_META[p])

  return (
    <>
      {/* HQ Panel */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>{title}</p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>{description}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.875rem' }}>
          {existingProviders.map(p => {
            const { isConnected, isActive, connectedAt } = getStatusFor(p)
            return (
              <IntegrationCard
                key={p}
                provider={p}
                tenantId={hqTenantId}
                tenantName="Nixvra HQ"
                isConnected={isConnected}
                isActive={isActive}
                connectedAt={connectedAt}
                onRefresh={onRefresh}
              />
            )
          })}
        </div>
      </div>

      {/* Tenant Coverage Table */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
        <p style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--text-primary)', margin: '0 0 1rem' }}>
          Tenant Coverage
        </p>
        <TenantConnectionTable
          integrations={allIntegrations.filter(r => providers.includes(r.provider))}
        />
      </div>
    </>
  )
}
