'use client'

import React, { useState, useTransition, useEffect } from 'react'
import { createSocialPost, getConnectedMetaPages } from '@/actions/marketing'
import { createMultiTenantPost, getAllTenantsForSocial } from '@/actions/super-admin-social'

const PLATFORM_COLORS: Record<string, string> = {
  facebook: '#1877F2',
  instagram: '#E1306C',
  twitter: '#1DA1F2',
}

const EMOJI_QUICK = ['😊','🔥','💡','🚀','🎉','✅','⚡','💬','📢','🌟','👏','🎯','📈','💎','🙌']

interface Tenant { id: string; name: string; subdomain: string; industry: string | null }
interface Page   { id: string; name: string }

interface Props {
  hqTenantId: string
  onPostCreated?: () => void
}

export default function SocialPostComposer({ hqTenantId, onPostCreated }: Props) {
  const [isPending, startTransition] = useTransition()
  const [tenants,  setTenants]  = useState<Tenant[]>([])
  const [pages,    setPages]    = useState<Page[]>([])

  // Form state
  const [caption,      setCaption]      = useState('')
  const [mediaUrl,     setMediaUrl]     = useState('')
  const [platforms,    setPlatforms]    = useState<string[]>(['facebook', 'instagram'])
  const [scheduledFor, setScheduledFor] = useState('')
  const [selectedPage, setSelectedPage] = useState('')
  const [targetMode,   setTargetMode]   = useState<'hq' | 'tenant' | 'multi'>('hq')
  const [selectedTenants, setSelectedTenants] = useState<string[]>([])
  const [previewTab,   setPreviewTab]   = useState<'facebook' | 'instagram' | 'whatsapp'>('facebook')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const charLimit = previewTab === 'facebook' ? 63206 : previewTab === 'instagram' ? 2200 : 1024
  const remaining = charLimit - caption.length

  useEffect(() => {
    getAllTenantsForSocial().then(setTenants).catch(() => {})
    getConnectedMetaPages(hqTenantId).then(pgs => {
      setPages(pgs)
      if (pgs.length > 0) setSelectedPage(pgs[0].id)
    }).catch(() => {})
  }, [hqTenantId])

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  function handleCreate() {
    if (!caption.trim() || platforms.length === 0) return
    const page = pages.find(p => p.id === selectedPage)

    startTransition(async () => {
      try {
        if (targetMode === 'hq') {
          await createSocialPost(hqTenantId, {
            platforms, caption, mediaUrl: mediaUrl || undefined,
            scheduledFor: scheduledFor || undefined,
            metadata: { pageId: page?.id, pageName: page?.name, source: 'super_admin_composer' },
          })
          showToast('HQ post created!', true)
        } else if (targetMode === 'tenant' && selectedTenants.length === 1) {
          await createSocialPost(selectedTenants[0], {
            platforms, caption, mediaUrl: mediaUrl || undefined,
            scheduledFor: scheduledFor || undefined,
            metadata: { pageId: page?.id, pageName: page?.name, source: 'super_admin_composer' },
          })
          showToast('Post created for tenant!', true)
        } else if (targetMode === 'multi' && selectedTenants.length > 0) {
          const res = await createMultiTenantPost(selectedTenants, {
            platforms, caption, mediaUrl: mediaUrl || undefined,
            scheduledFor: scheduledFor || undefined,
            metadata: { source: 'super_admin_multi_composer' },
          })
          showToast(`Created for ${res.created}/${selectedTenants.length} tenants${res.errors.length ? ` (${res.errors.length} failed)` : ''}`, res.created > 0)
        }

        setCaption('')
        setMediaUrl('')
        setScheduledFor('')
        onPostCreated?.()
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : 'Failed to create post', false)
      }
    })
  }

  const toggleTenant = (id: string) =>
    setSelectedTenants(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: toast.ok ? 'rgba(16,185,129,0.95)' : 'rgba(244,63,94,0.95)',
          color: '#fff', padding: '0.75rem 1.25rem', borderRadius: 12,
          fontWeight: 600, fontSize: '0.875rem', boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>
            {toast.ok ? 'check_circle' : 'error'}
          </span>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: '#00B077' }}>edit_square</span>
        <div>
          <p style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>Post Composer</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Create posts for HQ, a specific tenant, or across multiple tenants at once</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', minHeight: 0 }}>
        {/* ── LEFT: FORM ── */}
        <div style={{ padding: '1.5rem', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Target Mode */}
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Post Target</p>
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              {([
                { key: 'hq',     label: 'HQ Only',      icon: 'star' },
                { key: 'tenant', label: 'One Tenant',   icon: 'corporate_fare' },
                { key: 'multi',  label: 'Multi-Tenant', icon: 'hub' },
              ] as const).map(m => (
                <button
                  key={m.key}
                  onClick={() => setTargetMode(m.key)}
                  style={{
                    flex: 1, padding: '0.5rem', borderRadius: 8, border: `1px solid ${targetMode === m.key ? '#00B077' : 'var(--border)'}`,
                    background: targetMode === m.key ? 'rgba(0,176,119,0.12)' : 'var(--bg-raised)',
                    color: targetMode === m.key ? '#818cf8' : 'var(--text-muted)',
                    fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', gap: 4, transition: 'all 150ms',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tenant Selector */}
          {targetMode !== 'hq' && (
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                {targetMode === 'multi' ? `Select Tenants (${selectedTenants.length} selected)` : 'Select Tenant'}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', maxHeight: 140, overflowY: 'auto' }}>
                {tenants.map(t => {
                  const active = selectedTenants.includes(t.id)
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        if (targetMode === 'tenant') setSelectedTenants([t.id])
                        else toggleTenant(t.id)
                      }}
                      style={{
                        padding: '0.3rem 0.625rem', borderRadius: 6,
                        border: `1px solid ${active ? '#00B077' : 'var(--border)'}`,
                        background: active ? 'rgba(0,176,119,0.12)' : 'var(--bg-raised)',
                        color: active ? '#818cf8' : 'var(--text-secondary)',
                        fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 120ms',
                      }}
                    >
                      {t.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Platforms */}
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Platforms</p>
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              {Object.entries(PLATFORM_COLORS).map(([p, col]) => (
                <button
                  key={p}
                  onClick={() => setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                  style={{
                    padding: '0.4rem 0.875rem', borderRadius: 999,
                    border: `1.5px solid ${platforms.includes(p) ? col : 'var(--border)'}`,
                    background: platforms.includes(p) ? `${col}18` : 'transparent',
                    color: platforms.includes(p) ? col : 'var(--text-muted)',
                    fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer',
                    textTransform: 'capitalize', transition: 'all 150ms',
                  }}
                >{p}</button>
              ))}
            </div>
          </div>

          {/* Caption */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Caption</p>
              <span style={{ fontSize: '0.6875rem', color: remaining < 50 ? '#f43f5e' : 'var(--text-muted)', fontWeight: 600 }}>
                {remaining < 0 ? `${Math.abs(remaining)} over limit` : `${remaining} remaining`}
              </span>
            </div>
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Write your content here... use # for hashtags, @ for mentions"
              rows={5}
              className="form-input"
              style={{ width: '100%', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
            {/* Quick emoji bar */}
            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              {EMOJI_QUICK.map(e => (
                <button
                  key={e}
                  onClick={() => setCaption(prev => prev + e)}
                  style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.125rem 0.25rem', fontSize: '1rem', cursor: 'pointer', lineHeight: 1.5 }}
                  title={`Add ${e}`}
                >{e}</button>
              ))}
            </div>
          </div>

          {/* Media + Schedule grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Media URL</p>
              <input
                value={mediaUrl} onChange={e => setMediaUrl(e.target.value)}
                placeholder="https://your-image.jpg"
                className="form-input"
              />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Schedule At</p>
              <input
                type="datetime-local" value={scheduledFor}
                onChange={e => setScheduledFor(e.target.value)}
                className="form-input"
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
          </div>

          {/* Meta page (HQ/tenant mode only) */}
          {targetMode !== 'multi' && pages.length > 0 && (
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Meta Page</p>
              <select value={selectedPage} onChange={e => setSelectedPage(e.target.value)} className="form-input">
                {pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleCreate}
            disabled={isPending || !caption.trim() || platforms.length === 0 || remaining < 0}
            className="btn btn-primary"
            style={{ alignSelf: 'flex-start', background: 'linear-gradient(135deg,#00B077,#008E60)', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>
              {isPending ? 'sync' : scheduledFor ? 'schedule_send' : 'send'}
            </span>
            {isPending ? 'Creating...' : scheduledFor ? 'Schedule Post' : 'Save Draft'}
          </button>
        </div>

        {/* ── RIGHT: LIVE PREVIEW ── */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Live Preview</p>

          {/* Preview Tab */}
          <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-raised)', padding: '0.2rem', borderRadius: 8, border: '1px solid var(--border)' }}>
            {(['facebook', 'instagram', 'whatsapp'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPreviewTab(p)}
                style={{
                  flex: 1, padding: '0.3rem', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontSize: '0.6875rem', fontWeight: 700, transition: 'all 150ms',
                  background: previewTab === p ? 'var(--bg-surface)' : 'transparent',
                  color: previewTab === p ? (PLATFORM_COLORS[p] || '#00B077') : 'var(--text-muted)',
                  textTransform: 'capitalize',
                }}
              >{p}</button>
            ))}
          </div>

          {/* Facebook preview */}
          {previewTab === 'facebook' && (
            <div style={{ background: '#18191a', borderRadius: 10, padding: '1rem', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#00B077,#008E60)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '0.875rem' }}>O</div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#fff', margin: 0 }}>Nixvra</p>
                  <p style={{ fontSize: '0.6875rem', color: '#9898b8', margin: 0 }}>Just now · 🌐</p>
                </div>
              </div>
              <p style={{ fontSize: '0.875rem', color: '#e4e6eb', lineHeight: 1.5, marginBottom: '0.75rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {caption || 'Your post content will appear here...'}
              </p>
              {mediaUrl && (
                <div style={{ borderRadius: 8, overflow: 'hidden', marginBottom: '0.75rem', height: 160, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={mediaUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                </div>
              )}
              <div style={{ display: 'flex', gap: '1rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                {['👍 Like','💬 Comment','↗️ Share'].map(a => (
                  <span key={a} style={{ fontSize: '0.75rem', color: '#9898b8', fontWeight: 600 }}>{a}</span>
                ))}
              </div>
            </div>
          )}

          {/* Instagram preview */}
          {previewTab === 'instagram' && (
            <div style={{ background: '#000', borderRadius: 10, padding: '1rem', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '0.75rem' }}>O</div>
                </div>
                <p style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#fff', margin: 0 }}>omnicore_os</p>
              </div>
              {mediaUrl ? (
                <div style={{ aspectRatio: '1', borderRadius: 4, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={mediaUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                </div>
              ) : (
                <div style={{ aspectRatio: '1', borderRadius: 4, background: 'rgba(255,255,255,0.05)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'rgba(255,255,255,0.2)' }}>image</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.5rem' }}>
                {['favorite','chat_bubble_outline','send'].map(i => (
                  <span key={i} className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: '#fff' }}>{i}</span>
                ))}
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#fff', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                <span style={{ fontWeight: 700 }}>omnicore_os</span>{' '}
                {caption || <span style={{ color: 'rgba(255,255,255,0.3)' }}>Your caption here...</span>}
              </p>
            </div>
          )}

          {/* WhatsApp preview */}
          {previewTab === 'whatsapp' && (
            <div style={{ background: '#0d1117', borderRadius: 10, padding: '1rem', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '0.75rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#25d366', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '0.875rem' }}>O</div>
                <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#fff', margin: 0 }}>Nixvra Business</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ background: '#025c4c', borderRadius: '12px 12px 2px 12px', padding: '0.625rem 0.875rem', maxWidth: '85%' }}>
                  <p style={{ fontSize: '0.875rem', color: '#e9edef', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {caption || <span style={{ opacity: 0.4 }}>Your message...</span>}
                  </p>
                  <p style={{ fontSize: '0.6875rem', color: 'rgba(233,237,239,0.6)', margin: '0.25rem 0 0', textAlign: 'right' }}>
                    {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} ✓✓
                  </p>
                </div>
              </div>
              <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: '0.75rem' }}>
                {remaining}/{charLimit} chars · WA Business API
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
