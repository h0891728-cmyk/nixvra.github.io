'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { getGlobalWhatsAppEvents } from '@/actions/super-admin-social'
import PaginationControls from '@/components/ui/PaginationControls'

type InboxMessage = {
  publicId: string
  status: string
  createdAt: string
  payload: {
    type?: string
    to?: string
    message?: string
    recipientCount?: number
    via?: string
    messageId?: string
    error?: string
  }
  tenant: { id: string; name: string; subdomain: string }
}

const TYPE_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  broadcast:         { label: 'Broadcast',  color: '#00B077', bg: 'rgba(0,176,119,0.1)',  icon: 'cell_tower' },
  outgoing_message:  { label: 'Message',    color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: 'chat' },
  incoming_message:  { label: 'Received',   color: '#06b6d4', bg: 'rgba(6,182,212,0.1)',  icon: 'mark_chat_unread' },
}

const STATUS_COLORS: Record<string, string> = {
  PROCESSED: '#10b981', FAILED: '#f43f5e', PENDING: '#f59e0b',
}

export default function UnifiedInbox() {
  const [messages, setMessages]   = useState<InboxMessage[]>([])
  const [loading,  setLoading]    = useState(true)
  const [search,   setSearch]     = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [selected, setSelected]   = useState<InboxMessage | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 12

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getGlobalWhatsAppEvents()
    setMessages(data as unknown as InboxMessage[])
    setCurrentPage(1)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { setCurrentPage(1) }, [search, typeFilter, messages.length])

  const filtered = messages.filter(m => {
    const p = m.payload || {}
    const text = [p.message, p.to, m.tenant.name].filter(Boolean).join(' ').toLowerCase()
    const matchSearch = !search || text.includes(search.toLowerCase())
    const msgType = p.type || 'outgoing_message'
    const matchType = typeFilter === 'ALL' || msgType === typeFilter
    return matchSearch && matchType
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedMessages = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const typeOptions = ['ALL', 'broadcast', 'outgoing_message']

  return (
    <div style={{ display: 'flex', gap: '1.25rem', height: 680 }}>
      {/* ── LEFT: INBOX LIST ── */}
      <div style={{ flex: '0 0 420px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.4rem', color: '#25d366' }}>inbox</span>
            <p style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--text-primary)', margin: 0, flex: 1 }}>Unified Inbox</p>
            <button onClick={load} disabled={loading} style={{ padding: '0.375rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>refresh</span>
            </button>
          </div>

          <div style={{ position: 'relative' }}>
            <span className="material-symbols-outlined" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', color: 'var(--text-muted)', pointerEvents: 'none' }}>search</span>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search messages..."
              className="form-input"
              style={{ paddingLeft: '2.125rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {typeOptions.map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                style={{
                  flex: 1, padding: '0.3rem 0.5rem', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: '0.6875rem', transition: 'all 150ms', textTransform: 'capitalize',
                  background: typeFilter === t ? '#00B077' : 'var(--bg-raised)',
                  color: typeFilter === t ? '#fff' : 'var(--text-muted)',
                }}
              >
                {t === 'ALL' ? 'All' : t.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Message list */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading inbox...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem', opacity: 0.4 }}>inbox</span>
              No messages match your search.
            </div>
          ) : (
            paginatedMessages.map((m, idx) => {
              const p = m.payload || {}
              const msgType = p.type || 'outgoing_message'
              const tm = TYPE_META[msgType] || TYPE_META.outgoing_message
              const isActive = selected?.publicId === m.publicId

              return (
                <div
                  key={`${m.tenant.id}-${m.publicId}-${idx}`}
                  onClick={() => setSelected(m)}
                  style={{
                    padding: '0.875rem 1rem', borderBottom: '1px solid var(--border)',
                    cursor: 'pointer', transition: 'background 150ms',
                    background: isActive ? 'rgba(0,176,119,0.08)' : 'transparent',
                    borderLeft: isActive ? '2px solid #00B077' : '2px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: tm.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: tm.color }}>{tm.icon}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {p.type === 'broadcast' ? `Broadcast to ${p.recipientCount || '?'} recipients` : `→ ${p.to || 'Unknown'}`}
                        </span>
                        <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: 6 }}>
                          {new Date(m.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.15rem 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.message || '(Template message)'}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#00B077' }}>{m.tenant.name}</span>
                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: STATUS_COLORS[m.status] || '#888' }} />
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: STATUS_COLORS[m.status] || 'var(--text-muted)' }}>{m.status}</span>
                        {p.via && <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>· via {p.via}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer count */}
        <div style={{ padding: '0.625rem 1rem', borderTop: '1px solid var(--border)', background: 'var(--bg-raised)' }}>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {filtered.length} of {messages.length} events
          </span>
        </div>
        <PaginationControls
          currentPage={safePage}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemLabel="messages"
        />
      </div>

      {/* ── RIGHT: DETAIL PANE ── */}
      <div style={{ flex: 1, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selected ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '3rem', marginBottom: '0.75rem', opacity: 0.3 }}>mark_email_read</span>
            <p style={{ fontWeight: 600, fontSize: '0.9375rem', margin: 0 }}>Select a message to view details</p>
            <p style={{ fontSize: '0.8125rem', margin: '0.375rem 0 0' }}>{messages.length} events across all tenants</p>
          </div>
        ) : (
          <>
            {/* Detail Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              {(() => {
                const msgType = selected.payload?.type || 'outgoing_message'
                const tm = TYPE_META[msgType] || TYPE_META.outgoing_message
                return (
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: tm.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.4rem', color: tm.color }}>{tm.icon}</span>
                  </div>
                )
              })()}
              <div>
                <p style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>
                  {selected.payload?.type === 'broadcast'
                    ? `WhatsApp Broadcast — ${selected.payload.recipientCount || '?'} recipients`
                    : `WhatsApp Message → ${selected.payload?.to || 'Unknown'}`
                  }
                </p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#00B077' }}>{selected.tenant.name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(selected.createdAt).toLocaleString('en-IN')}
                  </span>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 999, background: `${STATUS_COLORS[selected.status] || '#888'}18`, color: STATUS_COLORS[selected.status] || 'var(--text-muted)' }}>
                    {selected.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Message Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Message Bubble */}
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Message Content</p>
                <div style={{ background: '#025c4c', borderRadius: '12px 12px 2px 12px', padding: '1rem 1.25rem', maxWidth: 480 }}>
                  <p style={{ color: '#e9edef', fontSize: '0.9375rem', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {selected.payload?.message || '(Template-based message — no raw text available)'}
                  </p>
                  <p style={{ color: 'rgba(233,237,239,0.5)', fontSize: '0.6875rem', margin: '0.5rem 0 0', textAlign: 'right' }}>
                    {new Date(selected.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} ✓✓
                  </p>
                </div>
              </div>

              {/* Metadata Grid */}
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Event Metadata</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.625rem' }}>
                  {[
                    { label: 'Tenant', value: selected.tenant.name },
                    { label: 'Subdomain', value: `@${selected.tenant.subdomain}` },
                    { label: 'Event Type', value: selected.payload?.type?.replace('_', ' ') || '—' },
                    { label: 'Status', value: selected.status },
                    { label: 'Delivery Via', value: selected.payload?.via || '—' },
                    { label: 'Message ID', value: selected.payload?.messageId || '—' },
                    selected.payload?.recipientCount ? { label: 'Recipients', value: String(selected.payload.recipientCount) } : null,
                    selected.payload?.error ? { label: 'Error', value: selected.payload.error } : null,
                  ].filter(Boolean).map((item, i) => (
                    <div key={i} style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.75rem' }}>
                      <p style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.25rem' }}>{item!.label}</p>
                      <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: item!.label === 'Error' ? '#f43f5e' : 'var(--text-primary)', margin: 0, wordBreak: 'break-all' }}>{item!.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
