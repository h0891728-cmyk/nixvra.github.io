'use client'

import React, { useState, useEffect, useCallback, useTransition } from 'react'
import { getGlobalSocialPosts, bulkDeleteSocialPosts } from '@/actions/super-admin-social'
import { publishSocialPost } from '@/actions/marketing'
import PaginationControls from '@/components/ui/PaginationControls'

const STATUS_PILL: Record<string, { bg: string; color: string }> = {
  DRAFT:     { bg: 'rgba(90,90,120,0.15)',   color: '#9898b8' },
  SCHEDULED: { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b' },
  PUBLISHED: { bg: 'rgba(16,185,129,0.12)',  color: '#10b981' },
  FAILED:    { bg: 'rgba(244,63,94,0.12)',   color: '#f43f5e' },
  CANCELLED: { bg: 'rgba(90,90,120,0.15)',   color: '#9898b8' },
}

const PLATFORM_DOT: Record<string, string> = {
  facebook: '#1877F2', instagram: '#E1306C', twitter: '#1DA1F2',
}

type Post = {
  publicId: string
  caption: string
  platforms: string[]
  status: string
  scheduledFor: string | null
  createdAt: string
  mediaUrl: string
  tenant: { id: string; name: string; subdomain: string }
}

interface Props { onCompose?: () => void }

export default function PostList({ onCompose }: Props) {
  const [posts,     setPosts]     = useState<Post[]>([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [selected,  setSelected]  = useState<Set<string>>(new Set())
  const [toast,     setToast]     = useState<{ msg: string; ok: boolean } | null>(null)
  const [isPending, startTransition] = useTransition()
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getGlobalSocialPosts()
    setPosts(data as unknown as Post[])
    setCurrentPage(1)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { setCurrentPage(1) }, [search, statusFilter, posts.length])

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  const filtered = posts.filter(p => {
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter
    const matchSearch = !search || p.caption.toLowerCase().includes(search.toLowerCase()) || p.tenant.name.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedPosts = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  function toggleSelect(key: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  function toggleAll() {
    const currentKeys = paginatedPosts.map(p => `${p.tenant.id}__${p.publicId}`)
    const allCurrentSelected = currentKeys.length > 0 && currentKeys.every(key => selected.has(key))
    if (allCurrentSelected) {
      setSelected(prev => {
        const next = new Set(prev)
        currentKeys.forEach(key => next.delete(key))
        return next
      })
    } else {
      setSelected(prev => {
        const next = new Set(prev)
        currentKeys.forEach(key => next.add(key))
        return next
      })
    }
  }

  function handleBulkDelete() {
    if (!confirm(`Delete ${selected.size} post(s)? This cannot be undone.`)) return
    const items = Array.from(selected).map(key => {
      const [tenantId, publicId] = key.split('__')
      return { tenantId, publicId }
    })
    startTransition(async () => {
      const res = await bulkDeleteSocialPosts(items)
      showToast(`${res.deleted} deleted${res.failed ? `, ${res.failed} failed` : ''}`, res.deleted > 0)
      setSelected(new Set())
      await load()
    })
  }

  function handlePublish(tenantId: string, publicId: string) {
    startTransition(async () => {
      const res = await publishSocialPost(tenantId, publicId) as { success: boolean; meta?: { error?: string } }
      if (res.success) showToast('Published!', true)
      else showToast(`Failed: ${res.meta?.error || 'Unknown'}`, false)
      await load()
    })
  }

  const statuses = ['ALL', 'DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED']

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: toast.ok ? 'rgba(16,185,129,0.95)' : 'rgba(244,63,94,0.95)',
          color: '#fff', padding: '0.75rem 1.25rem', borderRadius: 12, fontWeight: 600, fontSize: '0.875rem',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>{toast.ok ? 'check_circle' : 'error'}</span>
          {toast.msg}
        </div>
      )}

      {/* Toolbar */}
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <span className="material-symbols-outlined" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', color: 'var(--text-muted)', pointerEvents: 'none' }}>search</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search posts or tenants..."
            className="form-input"
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>

        {/* Status filter pills */}
        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '0.375rem 0.75rem', borderRadius: 999, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.75rem', transition: 'all 150ms',
                background: statusFilter === s
                  ? (s === 'ALL' ? '#00B077' : (STATUS_PILL[s]?.color || '#00B077'))
                  : 'var(--bg-raised)',
                color: statusFilter === s ? '#fff' : 'var(--text-muted)',
              }}
            >{s}</button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {selected.size > 0 && (
            <button onClick={handleBulkDelete} disabled={isPending} style={{ padding: '0.45rem 0.875rem', borderRadius: 8, border: '1px solid rgba(244,63,94,0.3)', background: 'rgba(244,63,94,0.1)', color: '#f43f5e', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer' }}>
              Delete {selected.size}
            </button>
          )}
          <button onClick={() => load()} disabled={loading} style={{ padding: '0.45rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>refresh</span>
          </button>
          <button onClick={onCompose} className="btn btn-primary btn-sm" style={{ background: '#00B077', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add</span> Compose
          </button>
        </div>
      </div>

      {/* Count bar */}
      <div style={{ padding: '0.625rem 1.5rem', background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={paginatedPosts.length > 0 && paginatedPosts.every(p => selected.has(`${p.tenant.id}__${p.publicId}`))}
            onChange={toggleAll}
            style={{ cursor: 'pointer', width: 14, height: 14 }}
          />
          {selected.size > 0 ? `${selected.size} selected` : `${filtered.length} posts`}
        </label>
        {['DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED'].map(s => {
          const count = posts.filter(p => p.status === s).length
          return count > 0 ? (
            <span key={s} style={{ fontSize: '0.6875rem', color: STATUS_PILL[s]?.color, fontWeight: 700 }}>
              {count} {s}
            </span>
          ) : null
        })}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem', opacity: 0.4 }}>public</span>
          Loading posts across all tenant databases...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem', opacity: 0.4 }}>search_off</span>
          No posts matching your filters.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {paginatedPosts.map(post => {
            const key = `${post.tenant.id}__${post.publicId}`
            const pill = STATUS_PILL[post.status] || STATUS_PILL.DRAFT
            const plats: string[] = Array.isArray(post.platforms) ? post.platforms : []

            return (
              <div
                key={key}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.875rem',
                  padding: '0.875rem 1.5rem',
                  borderBottom: '1px solid var(--border)',
                  background: selected.has(key) ? 'rgba(0,176,119,0.04)' : 'transparent',
                  transition: 'background 150ms',
                }}
              >
                <input
                  type="checkbox" checked={selected.has(key)}
                  onChange={() => toggleSelect(key)}
                  style={{ marginTop: 2, cursor: 'pointer', width: 14, height: 14, flexShrink: 0 }}
                />

                {/* Thumbnail */}
                <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--bg-raised)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {post.mediaUrl
                    ? <img src={post.mediaUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    : <span className="material-symbols-outlined" style={{ fontSize: '1.4rem', color: 'var(--text-muted)' }}>image</span>
                  }
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                    {/* Tenant badge */}
                    <span style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.1rem 0.45rem', fontSize: '0.6875rem', fontWeight: 700, color: '#00B077' }}>
                      {post.tenant.name}
                    </span>
                    {/* Platform dots */}
                    {plats.map(p => (
                      <span key={p} style={{ width: 8, height: 8, borderRadius: '50%', background: PLATFORM_DOT[p] || '#888', display: 'inline-block' }} title={p} />
                    ))}
                    {/* Status */}
                    <span style={{ fontSize: '0.625rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: 999, background: pill.bg, color: pill.color }}>
                      {post.status}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500, margin: '0 0 0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 520 }}>
                    {post.caption || '(No caption)'}
                  </p>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: 0 }}>
                    {post.scheduledFor
                      ? <><span style={{ color: '#f59e0b' }}>🕐 Scheduled:</span> {new Date(post.scheduledFor).toLocaleString('en-IN')}</>
                      : <>Created: {new Date(post.createdAt).toLocaleString('en-IN')}</>
                    }
                  </p>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {['DRAFT', 'SCHEDULED', 'FAILED'].includes(post.status) && (
                    <button
                      onClick={() => handlePublish(post.tenant.id, post.publicId)}
                      disabled={isPending}
                      title="Force Publish Now"
                      style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>publish</span>
                    </button>
                  )}
                  {post.status === 'FAILED' && (
                    <button
                      onClick={() => handlePublish(post.tenant.id, post.publicId)}
                      disabled={isPending}
                      title="Retry"
                      style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.08)', color: '#f59e0b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>replay</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      <PaginationControls
        currentPage={safePage}
        totalItems={filtered.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        itemLabel="posts"
      />
    </div>
  )
}
