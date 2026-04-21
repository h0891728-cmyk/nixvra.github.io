'use client'

import React, { useState, useEffect, useTransition, useCallback } from 'react'
import {
  getSocialPosts, createSocialPost, publishSocialPost, deleteSocialPost,
  getConnectedMetaPages, getIntegrationStatus,
  getAdCampaigns, createAdCampaign, toggleAdCampaign, deleteAdCampaign,
  getWhatsAppMessages, sendWhatsAppBroadcast, sendWhatsAppMessage,
  getWhatsAppTemplates, getWhatsAppStatus,
} from '@/actions/marketing'
import { syncSocialAction, getSocialStatsAction, getSocialTimelineAction } from '@/actions/social-hub'
import { formatCompactNumber, formatCompactCurrency } from '@/lib/format'

/* ─── Types & Constants ─────────────────────────────────────── */
type Tab = 'social' | 'ads' | 'whatsapp'

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

function ConnBadge({ connected }: { connected: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: '0.6875rem', fontWeight: 700,
      padding: '0.2rem 0.55rem', borderRadius: 999,
      background: connected ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.1)',
      color: connected ? '#10b981' : '#f43f5e',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
      {connected ? 'Connected' : 'Not Connected'}
    </span>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN HUB
   ═══════════════════════════════════════════════════════════════ */
export default function MarketingHub({ tenantId, isSuperAdmin = false }: { tenantId: string, isSuperAdmin?: boolean }) {
  const [activeTab, setActiveTab] = useState<Tab>('social')
  const [integrations, setIntegrations] = useState<Record<string, any>>({})
  const [stats, setStats] = useState<any>(null)
  const [timeline, setTimeline] = useState<any[]>([])
  const [isSyncing, startSyncing] = useTransition()
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const loadData = useCallback(() => {
    getIntegrationStatus(tenantId).then(setIntegrations).catch(() => {})
    getSocialStatsAction().then(res => {
      if (res.stats) setStats(res.stats)
    }).catch(() => {})
    getSocialTimelineAction().then(res => {
      setTimeline(res.posts || [])
    }).catch(() => {})
  }, [tenantId])

  useEffect(() => {
    loadData()
  }, [loadData])

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  function handleSync() {
    startSyncing(async () => {
      const res = await syncSocialAction()
      showToast(res.message || res.error || 'Done', res.success)
      if (res.success) loadData()
    })
  }

  const metaConnected = !!integrations['META_GRAPH']?.connected
  const waConnected = !!integrations['WHATSAPP_CLOUD']?.connected

  const tabs = [
    { key: 'social' as Tab, label: 'Social Posts', icon: 'share', conn: metaConnected },
    { key: 'ads' as Tab, label: 'Ad Campaigns', icon: 'campaign', conn: metaConnected },
    { key: 'whatsapp' as Tab, label: 'WhatsApp', icon: 'chat', conn: waConnected },
  ]

  return (
    <div style={{ marginTop: isSuperAdmin ? '2rem' : '0' }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: toast.ok ? 'rgba(16,185,129,0.95)' : 'rgba(244,63,94,0.95)', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: 12, fontWeight: 600, fontSize: '0.875rem', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>{toast.ok ? 'check_circle' : 'error'}</span>
          {toast.msg}
        </div>
      )}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: '#00B077' }}>rocket_launch</span>
            Marketing & Communication Hub
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
            Manage social posts, ad campaigns, and WhatsApp messaging for this workspace.
          </p>
        </div>
        {/* Integration quick status pills */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button 
            onClick={handleSync} 
            disabled={isSyncing}
            style={{ marginRight: 8, padding: '0.4rem 0.8rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: '0.75rem' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem', animation: isSyncing ? 'spin 1s linear infinite' : 'none' }}>sync</span>
            {isSyncing ? 'Syncing...' : 'Sync History'}
          </button>

          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Integrations:</span>
          <ConnBadge connected={metaConnected} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Meta</span>
          <ConnBadge connected={waConnected} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>WhatsApp</span>
        </div>
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {[
            { l: 'Total Posts', v: formatCompactNumber(stats.totalPosts) },
            { l: 'Pending Posts', v: formatCompactNumber(stats.pendingPosts) },
            { l: 'Total Engagements', v: formatCompactNumber(stats.totalEngagements) },
            { l: 'Active Platforms', v: formatCompactNumber(stats.activePlatformsCount) },
          ].map(m => (
            <div key={m.l} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem' }}>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{m.v}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0', fontWeight: 600, textTransform: 'uppercase' }}>{m.l}</p>
            </div>
          ))}
        </div>
      )}

      {!!timeline.length && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: '0.875rem', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Historical Feed</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>Latest imported and published social records for this tenant.</p>
            </div>
            {stats && (
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#00B077', background: 'rgba(0,176,119,0.08)', padding: '0.3rem 0.55rem', borderRadius: 999 }}>
                  Reach {formatCompactNumber(stats.totalReach || 0)}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.08)', padding: '0.3rem 0.55rem', borderRadius: 999 }}>
                  WA Msgs {formatCompactNumber(stats.whatsappMessages || 0)}
                </span>
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
            {timeline.slice(0, 6).map(post => (
              <div key={post.id} style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 12, padding: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: post.imported ? '#00B077' : 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {(post.platforms?.[0] || 'social').toString()}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {new Date(post.scheduledFor || post.createdAt).toLocaleDateString('en-IN')}
                  </span>
                </div>
                <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.45rem', lineHeight: 1.4 }}>
                  {post.caption || 'Imported social record'}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.68rem', color: '#00B077', background: 'rgba(0,176,119,0.08)', padding: '0.2rem 0.45rem', borderRadius: 999 }}>
                    Likes {formatCompactNumber(post.likes || 0)}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: '#3b82f6', background: 'rgba(59,130,246,0.08)', padding: '0.2rem 0.45rem', borderRadius: 999 }}>
                    Comments {formatCompactNumber(post.comments || 0)}
                  </span>
                </div>
                {post.permalinkUrl && (
                  <a href={post.permalinkUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: '#00B077', fontWeight: 700, textDecoration: 'none' }}>
                    Open Source Post
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: '0.25rem', background: 'var(--bg-raised)', padding: '0.3rem',
        borderRadius: 12, border: '1px solid var(--border)', marginBottom: '1.25rem', width: 'fit-content',
      }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '0.5rem 1rem', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.8125rem', transition: 'all 200ms',
              background: activeTab === t.key ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: activeTab === t.key ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>{t.icon}</span>
            {t.label}
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: t.conn ? '#10b981' : '#f43f5e',
              flexShrink: 0,
            }} />
          </button>
        ))}
      </div>

      {/* Panel */}
      {activeTab === 'social'    && <SocialPostsPanel tenantId={tenantId} metaConnected={metaConnected} />}
      {activeTab === 'ads'       && <AdCampaignsPanel tenantId={tenantId} metaConnected={metaConnected} />}
      {activeTab === 'whatsapp'  && <WhatsAppPanel    tenantId={tenantId} waConnected={waConnected} />}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   SOCIAL POSTS PANEL
   ═══════════════════════════════════════════════════════════════ */
function SocialPostsPanel({ tenantId, metaConnected }: { tenantId: string; metaConnected: boolean }) {
  const [posts, setPosts]               = useState<any[]>([])
  const [pages, setPages]               = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [showCreate, setShowCreate]     = useState(false)
  const [toast, setToast]               = useState<{ msg: string; ok: boolean } | null>(null)
  const [isPending, startTransition]    = useTransition()

  const [caption, setCaption]           = useState('')
  const [mediaUrl, setMediaUrl]         = useState('')
  const [platforms, setPlatforms]       = useState<string[]>(['facebook', 'instagram'])
  const [scheduledFor, setScheduledFor] = useState('')
  const [selectedPage, setSelectedPage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [data, pg] = await Promise.all([
      getSocialPosts(tenantId),
      getConnectedMetaPages(tenantId),
    ])
    setPosts(data.map((p: any) => ({ ...p, id: String(p.id) })))
    setPages(pg)
    if (pg.length > 0 && !selectedPage) setSelectedPage(pg[0].id)
    setLoading(false)
  }, [tenantId, selectedPage])

  useEffect(() => { load() }, [load])

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  function handleCreate() {
    if (!caption) return
    const page = pages.find(p => p.id === selectedPage)
    startTransition(async () => {
      await createSocialPost(tenantId, {
        platforms, caption, mediaUrl,
        scheduledFor: scheduledFor || undefined,
        metadata: { pageId: page?.id, pageName: page?.name },
      })
      setCaption(''); setMediaUrl(''); setScheduledFor('')
      setShowCreate(false)
      showToast('Post created successfully!', true)
      await load()
    })
  }

  function handlePublish(publicId: string) {
    startTransition(async () => {
      const res: any = await publishSocialPost(tenantId, publicId)
      if (res.success) {
        const url = res.meta?.postUrl || res.meta?.facebookPostUrl || ''
        showToast(`Published successfully!${url ? ' Post link copied.' : ''}`, true)
      } else {
        showToast(`Publish failed: ${res.meta?.error || 'Unknown error'}`, false)
      }
      await load()
    })
  }

  function handleDelete(publicId: string) {
    startTransition(async () => {
      await deleteSocialPost(tenantId, publicId)
      showToast('Post deleted.', true)
      await load()
    })
  }

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem', position: 'relative' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: toast.ok ? 'rgba(16,185,129,0.95)' : 'rgba(244,63,94,0.95)',
          color: '#fff', padding: '0.75rem 1.25rem', borderRadius: 12,
          fontWeight: 600, fontSize: '0.875rem', boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>
            {toast.ok ? 'check_circle' : 'error'}
          </span>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Social Posts</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
            {posts.length} posts · {metaConnected ? `${pages.length} page(s) connected` : '⚠️ Meta not connected — posts will be simulated'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => load()}
            disabled={loading}
            style={{ padding: '0.45rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>refresh</span>
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="btn btn-primary btn-sm"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>{showCreate ? 'close' : 'add'}</span>
            {showCreate ? 'Cancel' : 'New Post'}
          </button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem', marginBottom: '1.25rem' }}>
          {/* Platform chips */}
          <div style={{ display: 'flex', gap: 6, marginBottom: '0.875rem', flexWrap: 'wrap' }}>
            {Object.entries(PLATFORM_COLORS).map(([p, col]) => (
              <button
                key={p}
                onClick={() => setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                style={{
                  padding: '0.3rem 0.75rem', borderRadius: 999,
                  border: `1.5px solid ${platforms.includes(p) ? col : 'var(--border)'}`,
                  background: platforms.includes(p) ? `${col}18` : 'transparent',
                  color: platforms.includes(p) ? col : 'var(--text-muted)',
                  fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', textTransform: 'capitalize',
                  transition: 'all 150ms',
                }}
              >{p}</button>
            ))}
          </div>

          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="Write your post caption..."
            rows={3}
            className="form-input"
            style={{ marginBottom: '0.75rem', resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.875rem' }}>
            {/* Page selector */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Target Page</label>
              <select
                value={selectedPage}
                onChange={e => setSelectedPage(e.target.value)}
                className="form-input"
                disabled={pages.length === 0}
              >
                {pages.length === 0
                  ? <option value="">No pages — connect Meta first</option>
                  : pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                }
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Media URL</label>
              <input
                value={mediaUrl}
                onChange={e => setMediaUrl(e.target.value)}
                placeholder="https://... (image/video)"
                className="form-input"
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Schedule (optional)</label>
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={e => setScheduledFor(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={isPending || !caption || platforms.length === 0}
            className="btn btn-primary btn-sm"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
              {scheduledFor ? 'schedule_send' : 'send'}
            </span>
            {isPending ? 'Creating...' : scheduledFor ? 'Schedule Post' : 'Create Draft'}
          </button>
        </div>
      )}

      {/* Posts list */}
      {loading ? <Spinner label="Loading posts..." /> : posts.length === 0 ? (
        <Empty icon="photo_library" title="No social posts yet" sub="Create your first post to get started" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {posts.map((post: any) => {
            const platformList: string[] = Array.isArray(post.platforms) ? post.platforms : []
            const meta: any = post.metadata || {}
            return (
              <div key={post.publicId} style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.875rem',
                padding: '0.875rem 1rem', borderRadius: 12,
                background: 'var(--bg-raised)', border: '1px solid var(--border)',
                transition: 'all 200ms',
              }}>
                {/* Thumb */}
                <div style={{
                  width: 52, height: 52, borderRadius: 10, flexShrink: 0,
                  background: 'var(--bg-overlay)', overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {post.mediaUrl
                    ? <img src={post.mediaUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span className="material-symbols-outlined" style={{ fontSize: '1.4rem', color: 'var(--text-muted)' }}>image</span>
                  }
                </div>

                {/* Body */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', margin: '0 0 0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {post.caption || '(No caption)'}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                    {meta.pageName && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>web</span>
                        {meta.pageName}
                      </span>
                    )}
                    {platformList.map((p: string) => (
                      <span key={p} style={{
                        fontSize: '0.625rem', fontWeight: 700, padding: '0.1rem 0.375rem',
                        borderRadius: 4, border: `1px solid ${PLATFORM_COLORS[p] || '#666'}40`,
                        background: `${PLATFORM_COLORS[p] || '#666'}12`,
                        color: PLATFORM_COLORS[p] || 'var(--text-muted)',
                        textTransform: 'capitalize',
                      }}>{p}</span>
                    ))}
                  </div>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: 0 }}>
                    {post.scheduledFor
                      ? `⏰ Scheduled: ${new Date(post.scheduledFor).toLocaleString('en-IN')}`
                      : new Date(post.createdAt).toLocaleString('en-IN')}
                  </p>
                  {post.status === 'FAILED' && meta.error && (
                    <p style={{ fontSize: '0.75rem', color: '#f43f5e', margin: '0.4rem 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '0.95rem' }}>error</span>
                      {meta.error}
                    </p>
                  )}
                  {meta.postUrl && (
                    <a
                      href={meta.postUrl} target="_blank" rel="noreferrer"
                      style={{ fontSize: '0.75rem', color: '#00B077', marginTop: '0.25rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>open_in_new</span>
                      View post
                    </a>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <StatusPill status={post.status} />
                  {['DRAFT', 'SCHEDULED', 'FAILED'].includes(post.status) && (
                    <button
                      onClick={() => handlePublish(post.publicId)}
                      disabled={isPending}
                      title="Publish Now"
                      style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>publish</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(post.publicId)}
                    disabled={isPending}
                    title="Delete"
                    style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(244,63,94,0.2)', background: 'rgba(244,63,94,0.08)', color: '#f43f5e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
   AD CAMPAIGNS PANEL
   ═══════════════════════════════════════════════════════════════ */
function AdCampaignsPanel({ tenantId, metaConnected }: { tenantId: string; metaConnected: boolean }) {
  const [campaigns, setCampaigns]     = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const [showCreate, setShowCreate]   = useState(false)
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null)
  const [isPending, startTransition]  = useTransition()

  const [objective, setObjective]     = useState('LEADS')
  const [budget, setBudget]           = useState('')
  const [campName, setCampName]       = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getAdCampaigns(tenantId)
    setCampaigns(data.map((c: any) => ({ ...c, id: String(c.id) })))
    setLoading(false)
  }, [tenantId])

  useEffect(() => { load() }, [load])

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  function handleCreate() {
    startTransition(async () => {
      const res: any = await createAdCampaign(tenantId, {
        objective, budget: parseFloat(budget) || 0, name: campName,
      })
      setObjective('LEADS'); setBudget(''); setCampName('')
      setShowCreate(false)
      showToast(
        res.isReal ? `Campaign created on Meta Ads! ID: ${res.campaign?.metaCampaignId}` : 'Campaign saved locally (connect Meta Ads for live deployment)',
        true
      )
      await load()
    })
  }

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem', position: 'relative' }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: toast.ok ? 'rgba(16,185,129,0.95)' : 'rgba(244,63,94,0.95)', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: 12, fontWeight: 600, fontSize: '0.875rem', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>{toast.ok ? 'check_circle' : 'error'}</span>
          {toast.msg}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Meta Ad Campaigns</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
            {campaigns.length} campaigns · {formatCompactCurrency(campaigns.reduce((s, c) => s + (c.budget || 0), 0))} total budget
            {!metaConnected && ' · ⚠️ Meta not connected'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => load()} disabled={loading} style={{ padding: '0.45rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>refresh</span>
          </button>
          <button onClick={() => setShowCreate(!showCreate)} className="btn btn-primary btn-sm">
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>{showCreate ? 'close' : 'add'}</span>
            {showCreate ? 'Cancel' : 'New Campaign'}
          </button>
        </div>
      </div>

      {showCreate && (
        <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.875rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Campaign Name</label>
              <input value={campName} onChange={e => setCampName(e.target.value)} placeholder="e.g. Summer Sale 2025" className="form-input" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Objective</label>
              <select value={objective} onChange={e => setObjective(e.target.value)} className="form-input">
                {Object.entries(OBJECTIVE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Total Budget (₹)</label>
              <input type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="5000" className="form-input" />
            </div>
          </div>
          {!metaConnected && (
            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '0.625rem 0.875rem', marginBottom: '0.875rem', fontSize: '0.8125rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>warning</span>
              Meta Ads not connected. Campaign will be saved locally only.
            </div>
          )}
          <button onClick={handleCreate} disabled={isPending || !budget} className="btn btn-primary btn-sm">
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>rocket_launch</span>
            {isPending ? 'Creating...' : 'Launch Campaign'}
          </button>
        </div>
      )}

      {loading ? <Spinner label="Loading campaigns..." /> : campaigns.length === 0 ? (
        <Empty icon="campaign" title="No ad campaigns yet" sub="Launch your first Meta ad campaign" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.75rem' }}>
          {campaigns.map((c: any) => {
            const metrics: any = c.metrics || {}
            return (
              <div key={c.publicId} style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem', transition: 'all 200ms' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <StatusPill status={c.status} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {c.metaCampaignId && (
                      <span title="Live on Meta Ads" style={{ fontSize: '0.6875rem', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>verified</span>
                        Live
                      </span>
                    )}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>
                <p style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.2rem' }}>
                  {OBJECTIVE_LABELS[c.objective] || c.objective}
                </p>
                <p style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10b981', margin: '0 0 0.75rem' }}>{formatCompactCurrency(c.budget)}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.375rem', marginBottom: '0.875rem' }}>
                  {[
                    { l: 'Impressions', v: formatCompactNumber(metrics.impressions || 0) },
                    { l: 'Clicks', v: formatCompactNumber(metrics.clicks || 0) },
                    { l: 'Leads', v: formatCompactNumber(metrics.leads || 0) },
                    { l: 'Spent', v: formatCompactCurrency(metrics.spent || 0) },
                  ].map(m => (
                    <div key={m.l} style={{ textAlign: 'center', background: 'var(--bg-overlay)', borderRadius: 8, padding: '0.375rem 0.125rem' }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{m.v}</p>
                      <p style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>{m.l}</p>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => startTransition(async () => { await toggleAdCampaign(tenantId, c.publicId); await load() })}
                    disabled={isPending}
                    style={{ flex: 1, padding: '0.5rem', borderRadius: 8, border: `1px solid ${c.status === 'ACTIVE' ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`, background: c.status === 'ACTIVE' ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)', color: c.status === 'ACTIVE' ? '#f59e0b' : '#10b981', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>{c.status === 'ACTIVE' ? 'pause' : 'play_arrow'}</span>
                    {c.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    onClick={() => startTransition(async () => { await deleteAdCampaign(tenantId, c.publicId); await load() })}
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
   WHATSAPP PANEL
   ═══════════════════════════════════════════════════════════════ */
function WhatsAppPanel({ tenantId, waConnected }: { tenantId: string; waConnected: boolean }) {
  const [messages, setMessages]         = useState<any[]>([])
  const [templates, setTemplates]       = useState<any[]>([])
  const [waStatus, setWaStatus]         = useState<any>(null)
  const [loading, setLoading]           = useState(true)
  const [isPending, startTransition]    = useTransition()
  const [activeView, setActiveView]     = useState<'chat' | 'broadcast'>('chat')
  const [toast, setToast]               = useState<{ msg: string; ok: boolean } | null>(null)

  const [chatTo, setChatTo]             = useState('')
  const [chatMsg, setChatMsg]           = useState('')
  const [bcTemplate, setBcTemplate]     = useState('')
  const [bcRecipients, setBcRecipients] = useState('')
  const [bcMessage, setBcMessage]       = useState('')
  const [useTemplate, setUseTemplate]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [data, tmpl, status] = await Promise.all([
      getWhatsAppMessages(tenantId),
      getWhatsAppTemplates(tenantId),
      getWhatsAppStatus(tenantId),
    ])
    setMessages(data.map((m: any) => ({ ...m, id: String(m.id) })))
    setTemplates(tmpl)
    setWaStatus(status)
    setLoading(false)
  }, [tenantId])

  useEffect(() => { load() }, [load])

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 5000)
  }

  function handleSendMessage() {
    if (!chatTo.trim() || !chatMsg.trim()) return
    startTransition(async () => {
      const res: any = await sendWhatsAppMessage(tenantId, { to: chatTo, message: chatMsg })
      if (res.success) {
        showToast(`Message sent! ${res.apiResult?.messageId ? `(ID: ${res.apiResult.messageId})` : '(Simulated)'}`, true)
        setChatMsg('')
      } else {
        showToast(`Send failed: ${res.apiResult?.error || 'Unknown error'}`, false)
      }
      await load()
    })
  }

  function handleBroadcast() {
    const recipientList = bcRecipients.split(',').map(r => r.trim()).filter(Boolean)
    if (recipientList.length === 0 || !bcMessage) return
    startTransition(async () => {
      const res: any = await sendWhatsAppBroadcast(tenantId, {
        templateName: bcTemplate || 'general_broadcast',
        recipients: recipientList,
        message: bcMessage,
        useTemplate: useTemplate && !!bcTemplate,
      })
      showToast(
        `Broadcast: ${res.successCount}/${recipientList.length} delivered${res.failureCount > 0 ? ` (${res.failureCount} failed)` : ''}`,
        res.success
      )
      if (res.success) { setBcRecipients(''); setBcMessage(''); setBcTemplate('') }
      await load()
    })
  }

  const subTabs = [
    { key: 'chat' as const, label: 'Direct Chat', icon: 'chat', color: '#10b981' },
    { key: 'broadcast' as const, label: 'Broadcast', icon: 'cell_tower', color: '#00B077' },
  ]

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: toast.ok ? 'rgba(16,185,129,0.95)' : 'rgba(244,63,94,0.95)', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: 12, fontWeight: 600, fontSize: '0.875rem', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>{toast.ok ? 'check_circle' : 'error'}</span>
          {toast.msg}
        </div>
      )}

      {/* Sub-header with WA status */}
      <div style={{ padding: '1.25rem 1.5rem 0', background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
        {/* Status row */}
        {waStatus && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '0.875rem', flexWrap: 'wrap' }}>
            <ConnBadge connected={waConnected} />
            {waConnected && waStatus.phoneNumberId && (
              <>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>phone</span>
                  Phone ID: <strong style={{ color: 'var(--text-primary)' }}>{waStatus.phoneNumberId}</strong>
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>business</span>
                  {waStatus.accountName}
                </span>
              </>
            )}
            {!waConnected && (
              <span style={{ fontSize: '0.75rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>warning</span>
                Connect WhatsApp integration to send real messages. Messages will be simulated.
              </span>
            )}
          </div>
        )}

        {/* Sub-tabs */}
        <div style={{ display: 'flex' }}>
          {subTabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveView(t.key)}
              style={{
                flex: 1, padding: '0.75rem', border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: '0.875rem', transition: 'all 200ms',
                background: 'transparent',
                color: activeView === t.key ? t.color : 'var(--text-muted)',
                borderBottom: `2px solid ${activeView === t.key ? t.color : 'transparent'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '1.5rem' }}>
        {activeView === 'chat' ? (
          <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem', marginBottom: '1.25rem' }}>
            <input
              value={chatTo}
              onChange={e => setChatTo(e.target.value)}
              placeholder="Recipient phone (+919876543210)"
              className="form-input"
              style={{ marginBottom: '0.75rem', width: '100%', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={chatMsg}
                onChange={e => setChatMsg(e.target.value)}
                placeholder="Type a message..."
                className="form-input"
                style={{ flex: 1 }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }}
              />
              <button
                onClick={handleSendMessage}
                disabled={isPending || !chatTo.trim() || !chatMsg.trim()}
                className="btn btn-primary btn-sm"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>send</span>
                {isPending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem', marginBottom: '1.25rem' }}>
            {/* Template toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.875rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={useTemplate} onChange={e => setUseTemplate(e.target.checked)} />
                Use Approved Template (required for 24h+ window)
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Template Name {useTemplate && <span style={{ color: '#f43f5e' }}>*</span>}</label>
                {templates.length > 0 ? (
                  <select value={bcTemplate} onChange={e => setBcTemplate(e.target.value)} className="form-input">
                    <option value="">Select template...</option>
                    {templates.map(t => (
                      <option key={t.name} value={t.name}>{t.name} ({t.status})</option>
                    ))}
                  </select>
                ) : (
                  <input value={bcTemplate} onChange={e => setBcTemplate(e.target.value)} placeholder="e.g. appointment_reminder" className="form-input" />
                )}
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Recipients (comma separated)</label>
                <input value={bcRecipients} onChange={e => setBcRecipients(e.target.value)} placeholder="+91..., +91..." className="form-input" />
              </div>
            </div>
            <textarea
              value={bcMessage}
              onChange={e => setBcMessage(e.target.value)}
              placeholder="Broadcast message content..."
              rows={3}
              className="form-input"
              style={{ marginBottom: '0.875rem', resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={handleBroadcast}
                disabled={isPending || !bcRecipients.trim() || !bcMessage.trim() || (useTemplate && !bcTemplate)}
                className="btn btn-primary btn-sm"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>cell_tower</span>
                {isPending ? 'Sending...' : `Send to ${bcRecipients.split(',').filter(r => r.trim()).length} recipient(s)`}
              </button>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {bcRecipients.split(',').filter(r => r.trim()).length} recipients
              </span>
            </div>
          </div>
        )}

        {/* Message history */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Message History ({messages.length})
            </h4>
            <button onClick={() => load()} disabled={loading} style={{ padding: '0.3rem 0.5rem', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>refresh</span>
            </button>
          </div>

          {loading ? <Spinner label="Loading messages..." /> : messages.length === 0 ? (
            <Empty icon="forum" title="No messages yet" sub="Send a message or broadcast to get started" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 420, overflowY: 'auto' }}>
              {messages.map((msg: any) => {
                const payload: any = msg.payload || {}
                const isBroadcast = payload.type === 'broadcast'
                const isOutgoing = payload.type === 'outgoing_message'
                const isReal = payload.via === 'whatsapp_cloud_api'

                return (
                  <div key={msg.publicId} style={{
                    padding: '0.75rem 1rem', borderRadius: 10,
                    background: isBroadcast ? 'rgba(0,176,119,0.05)' : isOutgoing ? 'rgba(16,185,129,0.05)' : 'var(--bg-raised)',
                    border: `1px solid ${isBroadcast ? 'rgba(0,176,119,0.15)' : isOutgoing ? 'rgba(16,185,129,0.15)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                  }}>
                    <span className="material-symbols-outlined" style={{
                      fontSize: '1.2rem', marginTop: 2, flexShrink: 0,
                      color: isBroadcast ? '#00B077' : isOutgoing ? '#10b981' : '#f59e0b',
                    }}>
                      {isBroadcast ? 'cell_tower' : isOutgoing ? 'send' : 'inbox'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem', flexWrap: 'wrap', gap: 4 }}>
                        <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                          {isBroadcast
                            ? `Broadcast to ${payload.recipientCount || 0} · ✅ ${payload.successCount || 0} · ❌ ${payload.failureCount || 0}`
                            : isOutgoing ? `To: ${payload.to}` : 'Incoming'}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {isReal && (
                            <span style={{ fontSize: '0.6875rem', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '0.75rem' }}>verified</span>
                              Live API
                            </span>
                          )}
                          <StatusPill status={msg.status} />
                          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                            {new Date(msg.createdAt).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {payload.message || JSON.stringify(payload).slice(0, 120)}
                      </p>
                      {payload.messageId && (
                        <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: '0.25rem 0 0', fontFamily: 'monospace' }}>
                          Message ID: {payload.messageId}
                        </p>
                      )}
                      {payload.error && (
                        <p style={{ fontSize: '0.75rem', color: '#f43f5e', margin: '0.25rem 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>error</span>
                          {payload.error}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Shared UI helpers ─────────────────────────────────────── */
function Spinner({ label }: { label: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
      <div className="spinner" style={{ margin: '0 auto 0.75rem' }} />
      <p style={{ fontSize: '0.875rem' }}>{label}</p>
    </div>
  )
}

function Empty({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
      <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.75rem', opacity: 0.4 }}>{icon}</span>
      <p style={{ fontWeight: 700, margin: '0 0 0.25rem' }}>{title}</p>
      <p style={{ fontSize: '0.8125rem', margin: 0 }}>{sub}</p>
    </div>
  )
}
