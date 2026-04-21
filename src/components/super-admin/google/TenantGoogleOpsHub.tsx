'use client'

import React, { useState, useEffect, useCallback, useTransition } from 'react'
import {
  getTenantGoogleStatus,
  getGmailInbox,
  sendGmailOnBehalf,
  getYouTubeChannel,
  getYouTubeVideos,
  updateYouTubeVideoPrivacy,
  startYouTubeResumableUpload,
  setYouTubeVideoThumbnail,
} from '@/actions/google-ops'

type Tab = 'overview' | 'gmail' | 'youtube' | 'postvideo'

function Toast({ msg, ok, onClose }: { msg: string; ok: boolean; onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: ok ? 'rgba(16,185,129,0.95)' : 'rgba(244,63,94,0.95)',
      color: '#fff', padding: '0.75rem 1.25rem', borderRadius: 12,
      fontWeight: 600, fontSize: '0.875rem', boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      display: 'flex', alignItems: 'center', gap: 10, maxWidth: 400,
      animation: 'slideUp 200ms ease',
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>
        {ok ? 'check_circle' : 'error'}
      </span>
      <span style={{ flex: 1 }}>{msg}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}>
        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>close</span>
      </button>
    </div>
  )
}

function Spinner({ label = 'Loading...' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '3rem', color: 'var(--text-muted)' }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        border: '3px solid var(--border)', borderTopColor: '#4285F4',
        animation: 'spin 0.8s linear infinite',
      }} />
      <span style={{ fontSize: '0.875rem' }}>{label}</span>
    </div>
  )
}

function InfoRow({ icon, label, value, mono = false }: { icon: string; label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--text-muted)', width: 20, textAlign: 'center' }}>{icon}</span>
      <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', minWidth: 110 }}>{label}</span>
      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: mono ? 'monospace' : undefined }}>{value}</span>
    </div>
  )
}

/* ══════════════════════════════════════════════
   OVERVIEW TAB
   ══════════════════════════════════════════════ */
function OverviewTab({ tenantId, status }: { tenantId: string; status: any }) {
  if (!status?.connected) {
    return (
      <div style={{
        padding: '3rem 2rem', textAlign: 'center',
        background: 'var(--bg-raised)', borderRadius: 16, border: '1px dashed var(--border)',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--text-muted)', display: 'block', marginBottom: 12 }}>link_off</span>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.5rem' }}>Google Not Connected</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
          This tenant has not linked a Google account yet. Ask them to connect via their Marketplace integrations tab, or connect on their behalf from the Integrations tab above.
        </p>
      </div>
    )
  }

  const tokenHealthColor = status.isExpired ? '#f43f5e' : status.expiresInMinutes < 60 ? '#f59e0b' : '#10b981'
  const tokenHealthLabel = status.isExpired ? 'EXPIRED' : status.expiresInMinutes < 60 ? 'EXPIRING SOON' : 'HEALTHY'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Connection card */}
      <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'white', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png" alt="Google" style={{ width: 28, height: 28 }} />
          </div>
          <div>
            <p style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{status.email}</p>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0.2rem 0.5rem', borderRadius: 999, background: `${tokenHealthColor}15`, color: tokenHealthColor, fontSize: '0.6875rem', fontWeight: 700 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
              {tokenHealthLabel}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <InfoRow icon="person" label="Google Account ID" value={status.googleAccountId} mono />
          <InfoRow icon="schedule" label="Token Expires In" value={status.isExpired ? 'Expired — will auto-refresh on next use' : `${status.expiresInMinutes} minutes`} />
          <InfoRow icon="calendar_today" label="Connected On" value={new Date(status.connectedAt).toLocaleString('en-IN')} />
          <InfoRow icon="update" label="Last Refreshed" value={new Date(status.lastUpdated).toLocaleString('en-IN')} />
        </div>
      </div>

      {/* Granted scopes info */}
      <div style={{ background: 'rgba(66,133,244,0.05)', border: '1px solid rgba(66,133,244,0.15)', borderRadius: 14, padding: '1.25rem' }}>
        <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#4285F4', margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>verified_user</span>
          Granted Scopes
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
          {[
            { icon: 'mail', label: 'Gmail Read & Send', scope: 'gmail.modify' },
            { icon: 'play_circle', label: 'YouTube Management', scope: 'youtube.force-ssl' },
            { icon: 'storefront', label: 'Google My Business', scope: 'business.manage' },
            { icon: 'person', label: 'Profile & Email', scope: 'openid profile email' },
          ].map(s => (
            <div key={s.scope} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.5rem 0.75rem', background: 'var(--bg-raised)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#10b981' }}>{s.icon}</span>
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{s.label}</p>
                <p style={{ fontSize: '0.625rem', color: 'var(--text-muted)', margin: 0, fontFamily: 'monospace' }}>{s.scope}</p>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: '0.875rem', color: '#10b981', marginLeft: 'auto' }}>check_circle</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   GMAIL TAB
   ══════════════════════════════════════════════ */
function GmailTab({ tenantId }: { tenantId: string }) {
  const [inbox, setInbox]         = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [showCompose, setCompose] = useState(false)
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null)
  const [isPending, startT]       = useTransition()

  // Compose state
  const [to, setTo]               = useState('')
  const [subject, setSubject]     = useState('')
  const [body, setBody]           = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await getGmailInbox(tenantId, 25)
    if (!res.success) {
      setError(res.error || 'Failed to load inbox')
    } else {
      setInbox(res.emails as any[])
    }
    setLoading(false)
  }, [tenantId])

  useEffect(() => { load() }, [load])

  function handleSend() {
    if (!to || !subject || !body) return
    startT(async () => {
      const res = await sendGmailOnBehalf(tenantId, { to, subject, body })
      setToast({ msg: res.success ? `Email sent! ID: ${res.messageId}` : `Failed: ${res.error}`, ok: !!res.success })
      if (res.success) { setTo(''); setSubject(''); setBody(''); setCompose(false) }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />}

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: '#ea4335' }}>mail</span>
          <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>Gmail Inbox</span>
          {!loading && inbox.length > 0 && (
            <span style={{ fontSize: '0.75rem', background: 'rgba(234,67,53,0.1)', color: '#ea4335', padding: '0.15rem 0.5rem', borderRadius: 999, fontWeight: 700 }}>
              {inbox.filter(e => e.isUnread).length} unread
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} disabled={loading} style={{ padding: '0.45rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>refresh</span>
          </button>
          <button onClick={() => setCompose(!showCompose)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem', borderRadius: 8, background: '#ea4335', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>edit</span>
            Compose
          </button>
        </div>
      </div>

      {/* Compose panel */}
      {showCompose && (
        <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#ea4335' }}>send</span>
            Send Email on Tenant's Behalf
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input value={to} onChange={e => setTo(e.target.value)} placeholder="To: recipient@email.com" className="form-input" />
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" className="form-input" />
            <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Email body (HTML supported)..." rows={5} className="form-input" style={{ resize: 'vertical', width: '100%', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSend} disabled={isPending || !to || !subject || !body} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 1.25rem', borderRadius: 8, background: '#ea4335', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', opacity: isPending ? 0.7 : 1 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>send</span>
                {isPending ? 'Sending...' : 'Send Email'}
              </button>
              <button onClick={() => setCompose(false)} style={{ padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Inbox */}
      {loading ? <Spinner label="Loading Gmail inbox..." /> : error ? (
        <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(244,63,94,0.05)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 12, color: '#f43f5e' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }}>error</span>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem' }}>{error}</p>
        </div>
      ) : inbox.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', display: 'block', marginBottom: 8 }}>inbox</span>
          <p style={{ margin: 0, fontWeight: 600 }}>Inbox is empty</p>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          {inbox.map((email, i) => (
            <div key={email.id} style={{
              padding: '0.875rem 1.25rem',
              borderBottom: i < inbox.length - 1 ? '1px solid var(--border)' : 'none',
              display: 'flex', alignItems: 'flex-start', gap: 12,
              background: email.isUnread ? 'rgba(66,133,244,0.03)' : 'transparent',
              transition: 'background 150ms',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: email.isUnread ? '#4285F4' : 'var(--text-muted)', marginTop: 2, flexShrink: 0 }}>
                {email.isUnread ? 'mark_email_unread' : 'mark_email_read'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: email.isUnread ? 800 : 600, color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {email.subject}
                  </p>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>{email.date?.substring(0, 16)}</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#4285F4', margin: '0 0 0.2rem', fontWeight: 600 }}>{email.from}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {email.snippet}
                </p>
              </div>
              {email.labelIds?.includes('STARRED') && (
                <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#f59e0b' }}>star</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════
   YOUTUBE TAB
   ══════════════════════════════════════════════ */
function YouTubeTab({ tenantId, refreshKey }: { tenantId: string; refreshKey?: number }) {
  const [channel, setChannel]   = useState<any>(null)
  const [videos, setVideos]     = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [toast, setToast]       = useState<{ msg: string; ok: boolean } | null>(null)
  const [isPending, startT]     = useTransition()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [ch, vids] = await Promise.all([
      getYouTubeChannel(tenantId),
      getYouTubeVideos(tenantId, 20),
    ])
    if (!ch.success) { setError(ch.error || 'Failed'); setLoading(false); return }
    setChannel(ch.channel)
    setVideos((vids as any).videos || [])
    setLoading(false)
  }, [tenantId])

  useEffect(() => { load() }, [load, refreshKey])

  function handlePrivacyChange(videoId: string, newStatus: 'public' | 'private' | 'unlisted') {
    startT(async () => {
      const res = await updateYouTubeVideoPrivacy(tenantId, videoId, newStatus)
      setToast({ msg: res.success ? `Privacy updated to ${newStatus}` : `Failed: ${res.error}`, ok: !!res.success })
      if (res.success) {
        setVideos(prev => prev.map(v => v.id === videoId ? { ...v, privacyStatus: newStatus } : v))
      }
    })
  }

  const privacyColors: Record<string, string> = { public: '#10b981', unlisted: '#f59e0b', private: '#f43f5e', unknown: '#94a3b8' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />}

      {loading ? <Spinner label="Loading YouTube data..." /> : error ? (
        <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(244,63,94,0.05)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 12, color: '#f43f5e' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }}>error</span>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem' }}>{error}</p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>This Google account may not have a YouTube channel, or the youtube.force-ssl scope wasn't granted.</p>
        </div>
      ) : (
        <>
          {/* Channel card */}
          {channel && (
            <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {channel.thumbnailUrl && (
                <img src={channel.thumbnailUrl} alt="Channel" style={{ width: 56, height: 56, borderRadius: '50%', flexShrink: 0, objectFit: 'cover', border: '2px solid var(--border)' }} />
              )}
              <div style={{ flex: 1, minWidth: 180 }}>
                <p style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: '#FF0000' }}>play_circle</span>
                  {channel.title}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>@{channel.id} · {channel.country || 'Global'}</p>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                {[
                  { label: 'Subscribers', value: Number(channel.subscriberCount || 0).toLocaleString('en-IN'), icon: 'group' },
                  { label: 'Total Videos', value: Number(channel.videoCount || 0).toLocaleString('en-IN'), icon: 'video_library' },
                  { label: 'Total Views', value: Number(channel.viewCount || 0).toLocaleString('en-IN'), icon: 'visibility' },
                ].map(stat => (
                  <div key={stat.label} style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>{stat.value}</p>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: '0.25rem 0 0', display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>{stat.icon}</span>
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
              <a
                href={`https://www.youtube.com/channel/${channel.id}`}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0.45rem 0.875rem', borderRadius: 8, background: '#FF0000', color: '#fff', textDecoration: 'none', fontSize: '0.8125rem', fontWeight: 700 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>open_in_new</span>
                Open Channel
              </a>
            </div>
          )}

          {/* Videos */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-raised)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Videos ({videos.length})
              </p>
              <button onClick={load} style={{ padding: '0.4rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>refresh</span>
                Refresh
              </button>
            </div>
            {videos.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', display: 'block', marginBottom: 8 }}>video_library</span>
                <p style={{ margin: 0 }}>No videos found</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', padding: '1.25rem' }}>
                {videos.map((video: any) => (
                  <div key={video.id} style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
                    {/* Thumbnail */}
                    <div style={{ position: 'relative', aspectRatio: '16/9', background: '#000', overflow: 'hidden' }}>
                      {video.thumbnailUrl
                        ? <img src={video.thumbnailUrl} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><span className="material-symbols-outlined" style={{ fontSize: '2.5rem' }}>play_circle</span></div>
                      }
                      <span style={{
                        position: 'absolute', top: 8, right: 8,
                        fontSize: '0.6875rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 999,
                        background: `${privacyColors[video.privacyStatus] || '#94a3b8'}dd`,
                        color: '#fff',
                      }}>
                        {(video.privacyStatus || 'unknown').toUpperCase()}
                      </span>
                    </div>

                    {/* Info */}
                    <div style={{ padding: '0.875rem' }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.5rem', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {video.title}
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.375rem', marginBottom: '0.875rem' }}>
                        {[
                          { icon: 'visibility', value: Number(video.viewCount || 0).toLocaleString('en-IN') },
                          { icon: 'thumb_up', value: Number(video.likeCount || 0).toLocaleString('en-IN') },
                          { icon: 'comment', value: Number(video.commentCount || 0).toLocaleString('en-IN') },
                        ].map(s => (
                          <div key={s.icon} style={{ textAlign: 'center', background: 'var(--bg-overlay)', borderRadius: 8, padding: '0.375rem 0.25rem' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{s.icon}</span>
                            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{s.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <select
                          value={video.privacyStatus}
                          onChange={e => handlePrivacyChange(video.id, e.target.value as any)}
                          disabled={isPending}
                          style={{ flex: 1, padding: '0.4rem 0.5rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                          <option value="public">Public</option>
                          <option value="unlisted">Unlisted</option>
                          <option value="private">Private</option>
                        </select>
                        <a
                          href={video.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="Watch on YouTube"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 8, background: 'rgba(255,0,0,0.1)', color: '#FF0000', textDecoration: 'none', border: '1px solid rgba(255,0,0,0.2)' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>open_in_new</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════
   MAIN HUB COMPONENT
   ══════════════════════════════════════════════ */
function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      resolve(result)
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

function uploadVideoFile(
  uploadUrl: string,
  file: File,
  onProgress: (percent: number) => void
) {
  return new Promise<{ success: boolean; videoId?: string; error?: string }>((resolve) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl, true)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return
      onProgress(Math.max(1, Math.min(100, Math.round((event.loaded / event.total) * 100))))
    }

    xhr.onerror = () => resolve({ success: false, error: 'Video upload failed' })
    xhr.onabort = () => resolve({ success: false, error: 'Video upload cancelled' })
    xhr.onload = () => {
      let payload: { id?: string; error?: { message?: string } } | null = null
      try {
        payload = xhr.responseText ? JSON.parse(xhr.responseText) : null
      } catch {
        payload = null
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ success: true, videoId: payload?.id })
        return
      }

      resolve({
        success: false,
        error: payload?.error?.message || `Upload failed (HTTP ${xhr.status})`,
      })
    }

    xhr.send(file)
  })
}

function PostVideoTab({
  tenantId,
  onUploaded,
  onSwitchToYouTube,
}: {
  tenantId: string
  onUploaded: () => void
  onSwitchToYouTube: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [privacy, setPrivacy] = useState<'public' | 'unlisted' | 'private'>('private')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  async function handleUpload() {
    if (!title.trim() || !videoFile || uploading) return

    setToast(null)
    setUploading(true)
    setProgress(5)

    try {
      const start = await startYouTubeResumableUpload(tenantId, {
        title: title.trim(),
        description: description.trim(),
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        privacyStatus: privacy,
        fileSize: videoFile.size,
        mimeType: videoFile.type || 'video/mp4',
      })

      if (!start.success || !start.uploadUrl) {
        setToast({ msg: start.error || 'Failed to start YouTube upload', ok: false })
        setProgress(0)
        return
      }

      const upload = await uploadVideoFile(start.uploadUrl, videoFile, setProgress)
      if (!upload.success || !upload.videoId) {
        setToast({ msg: upload.error || 'Video upload failed', ok: false })
        setProgress(0)
        return
      }

      let successMessage = 'Video uploaded successfully'
      if (thumbnailFile) {
        const thumbDataUrl = await fileToBase64(thumbnailFile)
        const thumbBase64 = thumbDataUrl.split(',')[1] || ''
        const thumb = await setYouTubeVideoThumbnail(tenantId, upload.videoId, {
          base64: thumbBase64,
          mimeType: thumbnailFile.type || 'image/png',
        })
        if (!thumb.success) {
          successMessage = `Video uploaded, but thumbnail failed: ${thumb.error}`
        }
      }

      setProgress(100)
      setToast({ msg: successMessage, ok: true })
      setTitle('')
      setDescription('')
      setTags('')
      setPrivacy('private')
      setVideoFile(null)
      setThumbnailFile(null)
      onUploaded()
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unexpected upload failure'
      setToast({ msg, ok: false })
      setProgress(0)
    } finally {
      setUploading(false)
    }
  }

  const canUpload = !!title.trim() && !!videoFile && !uploading

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />}

      <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div>
            <p style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.3rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: '#00B077' }}>upload</span>
              Post New Video
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
              Upload a new YouTube video for this tenant and refresh the videos tab right after success.
            </p>
          </div>
          <button
            onClick={onSwitchToYouTube}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0.5rem 0.9rem',
              borderRadius: 10,
              border: '1px solid rgba(0,176,119,0.18)',
              background: 'rgba(0,176,119,0.08)',
              color: '#00B077',
              fontWeight: 700,
              fontSize: '0.8125rem',
              cursor: 'pointer',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>video_library</span>
            View Videos
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                Title
              </label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Launch update for Nixvra CRM"
                className="form-input"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Write a short description for the video..."
                rows={6}
                className="form-input"
                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                Tags
              </label>
              <input
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="crm, demo, launch"
                className="form-input"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                Privacy
              </label>
              <select
                value={privacy}
                onChange={e => setPrivacy(e.target.value as 'public' | 'unlisted' | 'private')}
                className="form-input"
                style={{ width: '100%', boxSizing: 'border-box', cursor: 'pointer' }}
              >
                <option value="public">Public</option>
                <option value="unlisted">Unlisted</option>
                <option value="private">Private</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                Video File
              </label>
              <input
                type="file"
                accept="video/*"
                onChange={e => setVideoFile(e.target.files?.[0] || null)}
                className="form-input"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>
                {videoFile ? `${videoFile.name} - ${(videoFile.size / 1024 / 1024).toFixed(2)} MB` : 'Select the video you want to upload'}
              </p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                Thumbnail
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={e => setThumbnailFile(e.target.files?.[0] || null)}
                className="form-input"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>
                {thumbnailFile ? thumbnailFile.name : 'Optional custom thumbnail image'}
              </p>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: 14, background: 'rgba(0,176,119,0.05)', border: '1px solid rgba(0,176,119,0.14)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#00B077' }}>Upload Progress</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{progress}%</span>
          </div>
          <div style={{ width: '100%', height: 10, borderRadius: 999, background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #00B077 0%, #35d5a2 100%)', transition: 'width 180ms ease' }} />
          </div>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
            Title and video file are required. After upload, the YouTube videos list refreshes automatically.
          </p>
          <button
            onClick={handleUpload}
            disabled={!canUpload}
            style={{
              minWidth: 170,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '0.75rem 1.1rem',
              borderRadius: 12,
              border: 'none',
              background: canUpload ? '#00B077' : 'rgba(0,176,119,0.35)',
              color: '#fff',
              fontWeight: 800,
              fontSize: '0.875rem',
              cursor: canUpload ? 'pointer' : 'not-allowed',
              boxShadow: canUpload ? '0 14px 28px rgba(0,176,119,0.22)' : 'none',
            }}
          >
            {uploading ? (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>progress_activity</span>
                Uploading...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>cloud_upload</span>
                Upload Video
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TenantGoogleOpsHub({ tenantId }: { tenantId: string }) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [status, setStatus]       = useState<any>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [youtubeRefreshKey, setYouTubeRefreshKey] = useState(0)

  const bumpYouTube = useCallback(() => setYouTubeRefreshKey(k => k + 1), [])

  useEffect(() => {
    getTenantGoogleStatus(tenantId).then(s => {
      setStatus(s)
      setStatusLoading(false)
    })
  }, [tenantId])

  const tabs: { key: Tab; label: string; icon: string; color: string }[] = [
    { key: 'overview', label: 'Connection', icon: 'link',        color: '#4285F4' },
    { key: 'gmail',    label: 'Gmail',      icon: 'mail',        color: '#ea4335' },
    { key: 'youtube',  label: 'YouTube',    icon: 'play_circle', color: '#FF0000' },
    { key: 'postvideo', label: 'Post Video', icon: 'upload',      color: '#FF0000' },
  ]

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-raised)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,1)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <img src="https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png" alt="Google" style={{ width: 24, height: 24 }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Google Operations Hub
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Operate Gmail & YouTube on behalf of this tenant
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {statusLoading ? (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Checking...</span>
            ) : status?.connected ? (
              <>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#10b981' }}>Connected</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>· {status.email}</span>
              </>
            ) : (
              <>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f43f5e' }} />
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#f43f5e' }}>Not Connected</span>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-raised)' }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '0.75rem 1.25rem', border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: '0.875rem', transition: 'all 200ms',
                background: 'transparent',
                color: activeTab === t.key ? t.color : 'var(--text-muted)',
                borderBottom: `2px solid ${activeTab === t.key ? t.color : 'transparent'}`,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div style={{ padding: '1.5rem' }}>
          {activeTab === 'overview' && <OverviewTab tenantId={tenantId} status={status} />}
          {activeTab === 'gmail'    && (status?.connected ? <GmailTab tenantId={tenantId} /> : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', display: 'block', marginBottom: 8 }}>link_off</span>
              <p style={{ margin: 0, fontWeight: 600 }}>Connect Google account first</p>
            </div>
          ))}
          {activeTab === 'youtube'  && (status?.connected ? <YouTubeTab tenantId={tenantId} refreshKey={youtubeRefreshKey} /> : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', display: 'block', marginBottom: 8 }}>link_off</span>
              <p style={{ margin: 0, fontWeight: 600 }}>Connect Google account first</p>
            </div>
          ))}
          {activeTab === 'postvideo'  && (status?.connected ? (
            <PostVideoTab
              tenantId={tenantId}
              onUploaded={() => bumpYouTube()}
              onSwitchToYouTube={() => setActiveTab('youtube')}
            />
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', display: 'block', marginBottom: 8 }}>link_off</span>
              <p style={{ margin: 0, fontWeight: 600 }}>Connect Google account first</p>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
