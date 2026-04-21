'use client'

import React, { useState, useEffect, useTransition, useCallback } from 'react'
import {
  getIntegrationStatus, getConnectedMetaPages,
  createSocialPost, publishSocialPost, deleteSocialPost,
  createAdCampaign, toggleAdCampaign, deleteAdCampaign,
  sendWhatsAppBroadcast, getWhatsAppStatus
} from '@/actions/marketing'
import { getGlobalSocialPosts, getGlobalAdCampaigns, getGlobalWhatsAppEvents } from '@/actions/super-admin-social'
import { upsertGlobalIntegrationAction } from '@/actions/integration-admin'
import { formatCompactNumber, formatCompactCurrency } from '@/lib/format'

// New enhanced components
import SocialPostComposer     from './SocialPostComposer'
import PostList               from './PostList'
import ContentCalendar        from './ContentCalendar'
import PlatformAccountManager from './PlatformAccountManager'
import GlobalAnalyticsDashboard from './GlobalAnalyticsDashboard'
import UnifiedInbox           from './UnifiedInbox'
import WhatsAppBulkUpload     from './WhatsAppBulkUpload'

/* ─── Types & Constants ─────────────────────────────────────── */
type Tab = 'overview' | 'posts' | 'calendar' | 'accounts' | 'analytics' | 'campaigns' | 'inbox' | 'contacts'

const STATUS_PILL: Record<string, { bg: string; color: string; label: string }> = {
  DRAFT:     { bg: 'rgba(90,90,120,0.15)',   color: '#9898b8', label: 'Draft' },
  SCHEDULED: { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b', label: 'Scheduled' },
  PUBLISHED: { bg: 'rgba(16,185,129,0.12)',  color: '#10b981', label: 'Published' },
  FAILED:    { bg: 'rgba(244,63,94,0.12)',   color: '#f43f5e', label: 'Failed' },
  CANCELLED: { bg: 'rgba(90,90,120,0.15)',   color: '#9898b8', label: 'Cancelled' },
  ACTIVE:    { bg: 'rgba(16,185,129,0.12)',  color: '#10b981', label: 'Active' },
  PAUSED:    { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b', label: 'Paused' },
  COMPLETED: { bg: 'rgba(6,182,212,0.12)',   color: '#06b6d4', label: 'Completed' },
  ARCHIVED:  { bg: 'rgba(90,90,120,0.15)',   color: '#9898b8', label: 'Archived' },
  PROCESSED: { bg: 'rgba(16,185,129,0.12)',  color: '#10b981', label: 'Processed' },
  PENDING:   { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b', label: 'Pending' },
}

const OBJECTIVE_LABELS: Record<string, string> = {
  LEADS: 'Lead Generation', TRAFFIC: 'Website Traffic',
  CONVERSIONS: 'Conversions', ENGAGEMENT: 'Engagement', APP_INSTALLS: 'App Installs',
}

const PLATFORM_COLORS: Record<string, string> = {
  facebook: '#1877F2', instagram: '#E1306C', twitter: '#1DA1F2',
}

function StatusPill({ status }: { status: string }) {
  const pill = STATUS_PILL[status] || STATUS_PILL.DRAFT
  return (
    <span style={{
      fontSize: '0.6875rem', fontWeight: 700, padding: '0.2rem 0.55rem',
      borderRadius: 999, background: pill.bg, color: pill.color,
      letterSpacing: '0.02em', whiteSpace: 'nowrap',
    }}>{pill.label}</span>
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

/* ═══════════════════════════════════════════════════════════════
   OVERVIEW PANEL
   ═══════════════════════════════════════════════════════════════ */
function OverviewPanel({ hqTenantId, metaConnected, waConnected, onNavigate }: {
  hqTenantId: string
  metaConnected: boolean
  waConnected: boolean
  onNavigate: (tab: Tab) => void
}) {
  const [posts,    setPosts]    = useState<Record<string, unknown>[]>([])
  const [campaigns,setCampaigns]= useState<Record<string, unknown>[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([
      getGlobalSocialPosts(),
      getGlobalAdCampaigns(),
    ]).then(([p, c]) => {
      setPosts(p as unknown as Record<string, unknown>[])
      setCampaigns(c as unknown as Record<string, unknown>[])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [hqTenantId])

  const today = new Date().toISOString().split('T')[0]
  const scheduledToday = posts.filter(p => {
    if (!p.scheduledFor) return false
    try { return new Date(p.scheduledFor as string | Date).toISOString().startsWith(today) } catch { return false }
  }).length
  const publishedThisMonth = posts.filter(p => {
    if (!p.createdAt) return false
    try {
      const d = new Date(p.createdAt as string | Date)
      const n = new Date()
      return p.status === 'PUBLISHED' && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
    } catch { return false }
  }).length

  const kpis = [
    { label: 'Total Posts',       value: posts.length,     icon: 'article',       color: '#00B077', tab: 'posts' as Tab },
    { label: 'Scheduled Today',   value: scheduledToday,   icon: 'schedule',      color: '#f59e0b', tab: 'calendar' as Tab },
    { label: 'Published This Mo.', value: publishedThisMonth, icon: 'cloud_done', color: '#10b981', tab: 'posts' as Tab },
    { label: 'Active Campaigns',  value: campaigns.filter(c => c.status === 'ACTIVE').length, icon: 'campaign', color: '#06b6d4', tab: 'campaigns' as Tab },
  ]

  const statusGroups = ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED'].map(s => ({
    status: s,
    count: posts.filter(p => p.status === s).length,
    pill: STATUS_PILL[s],
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Connection Status Bar */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>HQ Connection Status</span>
        {[
          { label: 'Meta Graph', connected: metaConnected, color: '#1877F2' },
          { label: 'WhatsApp',   connected: waConnected,   color: '#25d366' },
        ].map(c => (
          <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.connected ? '#10b981' : '#f43f5e', boxShadow: c.connected ? '0 0 6px rgba(16,185,129,0.5)' : 'none' }} />
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: c.connected ? '#10b981' : '#f43f5e' }}>{c.label}: {c.connected ? 'Connected' : 'Disconnected'}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button onClick={() => onNavigate('posts')} className="btn btn-primary btn-sm" style={{ background: '#00B077', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add_circle</span> Compose Post
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading platform metrics...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.875rem' }}>
          {kpis.map(k => (
            <div
              key={k.label}
              onClick={() => onNavigate(k.tab)}
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem', cursor: 'pointer', transition: 'border-color 200ms, box-shadow 200ms' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = k.color; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 1px ${k.color}` }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</p>
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: k.color }}>{k.icon}</span>
              </div>
              <p style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Post Status Breakdown */}
      {!loading && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
          <p style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--text-primary)', margin: '0 0 1rem' }}>Posts by Status — Platform Wide</p>
          <div style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap' }}>
            {statusGroups.map(g => (
              <div key={g.status} style={{ flex: '1 1 120px', background: g.pill.bg, borderRadius: 10, padding: '0.875rem 1rem', border: `1px solid ${g.pill.color}28` }}>
                <p style={{ fontSize: '1.5rem', fontWeight: 900, color: g.pill.color, margin: 0 }}>{g.count}</p>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: g.pill.color, margin: '0.25rem 0 0', textTransform: 'capitalize' }}>{g.status.toLowerCase()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.875rem' }}>
        {[
          { label: 'Open Post List',         tab: 'posts' as Tab,     icon: 'list_alt',       desc: 'Filter, search and manage all posts' },
          { label: 'View Content Calendar',  tab: 'calendar' as Tab,  icon: 'calendar_month', desc: 'See scheduled posts on a calendar view' },
          { label: 'Platform Accounts',      tab: 'accounts' as Tab,  icon: 'account_circle', desc: 'All connected Meta & WhatsApp accounts' },
          { label: 'Analytics Dashboard',    tab: 'analytics' as Tab, icon: 'monitoring',     desc: 'Performance charts and insights' },
        ].map(item => (
          <button
            key={item.tab}
            onClick={() => onNavigate(item.tab)}
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem', cursor: 'pointer', textAlign: 'left', transition: 'all 200ms' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#00B077'; (e.currentTarget as HTMLElement).style.background = 'rgba(0,176,119,0.04)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: '#00B077', display: 'block', marginBottom: '0.5rem' }}>{item.icon}</span>
            <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>{item.label}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{item.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   POSTS TAB (Composer + List combined)
   ═══════════════════════════════════════════════════════════════ */
function PostsTab({ hqTenantId }: { hqTenantId: string }) {
  const [showComposer, setShowComposer] = useState(false)
  const [refreshKey,   setRefreshKey]   = useState(0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {showComposer && (
        <SocialPostComposer
          hqTenantId={hqTenantId}
          onPostCreated={() => { setShowComposer(false); setRefreshKey(k => k + 1) }}
        />
      )}
      <PostList
        key={refreshKey}
        onCompose={() => setShowComposer(true)}
      />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   GLOBAL AD CAMPAIGNS PANEL (preserved from original)
   ═══════════════════════════════════════════════════════════════ */
function GlobalAdsPanel({ hqTenantId, metaConnected }: { hqTenantId: string; metaConnected: boolean }) {
  const [campaigns, setCampaigns] = useState<Record<string, unknown>[]>([])
  const [loading,   setLoading]   = useState(true)
  const [isPending, startTransition] = useTransition()

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getGlobalAdCampaigns()
    setCampaigns(data as unknown as Record<string, unknown>[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Keep metaConnected in scope to silence lint
  void metaConnected

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Global Ad Campaigns</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>{campaigns.length} total campaigns across the network.</p>
        </div>
        <button onClick={() => load()} disabled={loading} style={{ padding: '0.45rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>refresh</span>
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No ad campaigns found.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.875rem' }}>
          {campaigns.map((c, i) => {
            const metrics = (c.metrics || {}) as Record<string, unknown>
            const tenant  = c.tenant as { id: string; name: string; subdomain: string }
            return (
              <div key={`${tenant.id}-${c.publicId}-${i}`} style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <TenantBadge tenant={tenant} />
                  <StatusPill status={c.status as string} />
                </div>
                <p style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.2rem' }}>
                  {OBJECTIVE_LABELS[c.objective as string] || c.objective as string}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <p style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10b981', margin: 0 }}>{formatCompactCurrency(c.budget as number)}</p>
                  {!!(c.metaCampaignId as string) && <span style={{ fontSize: '0.6875rem', color: '#10b981', fontWeight: 700 }}>✓ Live</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.375rem', marginBottom: '0.875rem' }}>
                  {[
                    { l: 'Impr',   v: formatCompactNumber(Number(metrics.impressions) || 0) },
                    { l: 'Clicks', v: formatCompactNumber(Number(metrics.clicks) || 0) },
                    { l: 'Leads',  v: formatCompactNumber(Number(metrics.leads) || 0) },
                    { l: 'Spent',  v: formatCompactCurrency(Number(metrics.spent) || 0) },
                  ].map(m => (
                    <div key={m.l} style={{ textAlign: 'center', background: 'var(--bg-overlay)', borderRadius: 6, padding: '0.375rem 0.125rem' }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{m.v}</p>
                      <p style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>{m.l}</p>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => startTransition(async () => { await toggleAdCampaign(tenant.id, c.publicId as string); await load() })}
                    disabled={isPending}
                    style={{ flex: 1, padding: '0.5rem', borderRadius: 8, border: `1px solid ${c.status === 'ACTIVE' ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`, background: c.status === 'ACTIVE' ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)', color: c.status === 'ACTIVE' ? '#f59e0b' : '#10b981', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>{c.status === 'ACTIVE' ? 'pause' : 'play_arrow'}</span>
                    {c.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    onClick={() => startTransition(async () => { await deleteAdCampaign(tenant.id, c.publicId as string); await load() })}
                    disabled={isPending}
                    style={{ padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid rgba(244,63,94,0.2)', background: 'rgba(244,63,94,0.08)', color: '#f43f5e', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>delete</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   GLOBAL WHATSAPP PANEL (preserved from original)
   ═══════════════════════════════════════════════════════════════ */
function GlobalWhatsAppPanel({ hqTenantId, waConnected }: { hqTenantId: string; waConnected: boolean }) {
  const [messages,    setMessages]    = useState<Record<string, unknown>[]>([])
  const [waStatus,    setWaStatus]    = useState<Record<string, unknown> | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [isPending,   startTransition]= useTransition()
  const [bcMessage,   setBcMessage]   = useState('')
  const [bcRecipients,setBcRecipients]= useState('')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [data, status] = await Promise.all([
      getGlobalWhatsAppEvents(),
      getWhatsAppStatus(hqTenantId)
    ])
    setMessages(data as unknown as Record<string, unknown>[])
    setWaStatus(status as unknown as Record<string, unknown>)
    setLoading(false)
  }, [hqTenantId])

  useEffect(() => { load() }, [load])

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 5000)
  }

  function handleHqBroadcast() {
    const recipients = bcRecipients.split(',').map(r => r.trim()).filter(Boolean)
    if (recipients.length === 0 || !bcMessage) return
    startTransition(async () => {
      const res = await sendWhatsAppBroadcast(hqTenantId, { templateName: '', recipients, message: bcMessage, useTemplate: false }) as { success: boolean; successCount: number }
      showToast(`Broadcast: ${res.successCount}/${recipients.length} delivered`, res.success)
      if (res.success) { setBcRecipients(''); setBcMessage('') }
      await load()
    })
  }

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: toast.ok ? 'rgba(16,185,129,0.95)' : 'rgba(244,63,94,0.95)', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: 12, fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          {toast.msg}
        </div>
      )}
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 1rem' }}>HQ System Broadcast (WhatsApp)</h3>
        {waStatus && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: 999, background: waConnected ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: waConnected ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
              HQ Connection: {waConnected ? 'Active' : 'Missing — messages will simulate'}
            </span>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px,1fr) 2fr', gap: '1rem' }}>
          <textarea value={bcRecipients} onChange={e => setBcRecipients(e.target.value)} placeholder="Phones (comma separated)..." className="form-input" style={{ width: '100%', boxSizing: 'border-box' }} rows={2} />
          <div style={{ display: 'flex', gap: 8 }}>
            <textarea value={bcMessage} onChange={e => setBcMessage(e.target.value)} placeholder="HQ Broadcast message..." className="form-input" style={{ flex: 1, resize: 'none' }} rows={2} />
            <button onClick={handleHqBroadcast} disabled={isPending || !bcMessage || !bcRecipients} className="btn btn-primary" style={{ padding: '0 1.5rem', background: '#10b981' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>cell_tower</span> Send
            </button>
          </div>
        </div>
      </div>
      <div style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Global WhatsApp Traffic</h4>
          <button onClick={() => load()} disabled={loading} style={{ padding: '0.45rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>refresh</span>
          </button>
        </div>
        {loading ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Loading global logs...</div>
        ) : messages.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No WhatsApp activity.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {messages.map((m, i) => {
              const p = (m.payload || {}) as Record<string, unknown>
              const tenant = m.tenant as { id: string; name: string; subdomain: string }
              return (
                <div key={`${tenant.id}-${m.publicId}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1rem', borderRadius: 12, background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: p.type === 'broadcast' ? 'rgba(0,176,119,0.1)' : 'rgba(16,185,129,0.1)', color: p.type === 'broadcast' ? '#00B077' : '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>{p.type === 'broadcast' ? 'cell_tower' : 'chat'}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <TenantBadge tenant={tenant} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {p.type === 'broadcast' ? `Broadcast to ${p.recipientCount} recipients` : `Message to ${p.to}`}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.message as string}</p>
                    <div style={{ display: 'flex', gap: 8, fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      <span>{new Date(m.createdAt as string).toLocaleString('en-IN')}</span>
                      <span>· Via: {p.via as string}</span>
                    </div>
                  </div>
                  <StatusPill status={m.status as string} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   SETTINGS PANEL (preserved from original)
   ═══════════════════════════════════════════════════════════════ */
function GlobalSettingsPanel() {
  const [isPending, startTransition] = useTransition()
  const [provider,  setProvider] = useState('META_GRAPH')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await upsertGlobalIntegrationAction('omnicore_hq', fd)
      setToast({ msg: 'HQ Integration saved!', ok: true })
      setTimeout(() => setToast(null), 4000)
    })
  }

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem', position: 'relative' }}>
      {toast && (
        <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 99, background: toast.ok ? 'rgba(16,185,129,0.95)' : 'rgba(244,63,94,0.95)', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: 12, fontWeight: 600, fontSize: '0.875rem' }}>
          {toast.msg}
        </div>
      )}
      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 1rem' }}>HQ API Provisioning</h3>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Configure the platform's central marketing APIs used for HQ-level posting and broadcasting.</p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Integration Provider</label>
          <select name="provider" value={provider} onChange={e => setProvider(e.target.value)} className="form-input">
            <option value="META_GRAPH">Meta Graph API (Facebook / Instagram)</option>
            <option value="WHATSAPP_CLOUD">WhatsApp Cloud API</option>
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">API Key / Secret</label>
            <input type="password" name="apiKey" placeholder="Leave empty to keep existing" className="form-input" style={{ fontFamily: 'monospace' }} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Access Token / Bearer</label>
            <input type="password" name="accessToken" placeholder="Permanent or short-lived token" className="form-input" style={{ fontFamily: 'monospace' }} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Webhook Callback URL</label>
            <input type="text" name="webhookUrl" placeholder="https://..." className="form-input" style={{ fontFamily: 'monospace' }} />
          </div>
        </div>
        <button type="submit" disabled={isPending} className="btn btn-primary" style={{ alignSelf: 'flex-start', background: '#00B077', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>{isPending ? 'sync' : 'vpn_key'}</span>
          {isPending ? 'Provisioning...' : `Connect ${provider}`}
        </button>
      </form>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN HUB — 7-TAB COMMAND CENTER
   ═══════════════════════════════════════════════════════════════ */
export default function GlobalSocialHub({ hqTenantId }: { hqTenantId: string }) {
  const [activeTab,    setActiveTab]    = useState<Tab>('overview')
  const [integrations, setIntegrations] = useState<Record<string, { connected: boolean }>>({})

  useEffect(() => {
    getIntegrationStatus(hqTenantId)
      .then(d => setIntegrations(d as Record<string, { connected: boolean }>))
      .catch(() => {})
  }, [hqTenantId])

  const metaConnected = !!integrations['META_GRAPH']?.connected
  const waConnected   = !!integrations['WHATSAPP_CLOUD']?.connected

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'overview',   label: 'Overview',    icon: 'dashboard' },
    { key: 'posts',      label: 'Posts',       icon: 'article' },
    { key: 'calendar',   label: 'Calendar',    icon: 'calendar_month' },
    { key: 'accounts',   label: 'Accounts',    icon: 'account_circle' },
    { key: 'analytics',  label: 'Analytics',   icon: 'monitoring' },
    { key: 'campaigns',  label: 'Campaigns',   icon: 'campaign' },
    { key: 'inbox',      label: 'Inbox',       icon: 'inbox' },
    { key: 'contacts',   label: 'Contacts',    icon: 'contacts' },
  ]

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.75rem', color: '#f43f5e' }}>travel_explore</span>
            Global Marketing & Communications
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
            Master command center — manage all social activity across every Nixvra tenant from one place.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--bg-surface)', padding: '0.5rem 1rem', borderRadius: 12, border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>HQ:</span>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: metaConnected ? '#10b981' : '#f43f5e', boxShadow: metaConnected ? '0 0 6px rgba(16,185,129,0.5)' : 'none' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Meta</span>
          <div style={{ width: 1, height: 12, background: 'var(--border)', margin: '0 4px' }} />
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: waConnected ? '#10b981' : '#f43f5e', boxShadow: waConnected ? '0 0 6px rgba(37,211,102,0.5)' : 'none' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>WhatsApp</span>
        </div>
      </div>

      {/* 7-Tab Nav */}
      <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-raised)', padding: '0.3rem', borderRadius: 12, border: '1px solid var(--border)', marginBottom: '1.25rem', overflowX: 'auto', flexWrap: 'wrap' }}>
        {tabs.map(t => (
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
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview'  && <OverviewPanel hqTenantId={hqTenantId} metaConnected={metaConnected} waConnected={waConnected} onNavigate={setActiveTab} />}
      {activeTab === 'posts'     && <PostsTab hqTenantId={hqTenantId} />}
      {activeTab === 'calendar'  && <ContentCalendar />}
      {activeTab === 'accounts'  && <PlatformAccountManager />}
      {activeTab === 'analytics' && <GlobalAnalyticsDashboard />}
      {activeTab === 'campaigns' && <GlobalAdsPanel hqTenantId={hqTenantId} metaConnected={metaConnected} />}
      {activeTab === 'inbox'     && <UnifiedInbox />}
      {activeTab === 'contacts'  && <WhatsAppBulkUpload />}
    </div>
  )
}
