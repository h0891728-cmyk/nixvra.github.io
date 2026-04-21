'use client'

import type { CSSProperties } from 'react'
import { useCallback, useEffect, useState, useTransition } from 'react'
import {
  getWhatsAppMessages,
  getWhatsAppStatus,
  getWhatsAppTemplates,
  sendWhatsAppBroadcast,
  sendWhatsAppMessage,
} from '@/actions/marketing'

type ChatTab = 'direct' | 'broadcast'

function StatusPill({ status }: { status: string }) {
  const palette = status === 'PROCESSED'
    ? { bg: 'rgba(16,185,129,0.12)', color: '#10b981', label: 'Processed' }
    : status === 'FAILED'
      ? { bg: 'rgba(244,63,94,0.12)', color: '#f43f5e', label: 'Failed' }
      : { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: status }

  return (
    <span style={{
      fontSize: '0.6875rem',
      fontWeight: 700,
      padding: '0.2rem 0.55rem',
      borderRadius: 999,
      background: palette.bg,
      color: palette.color,
    }}>
      {palette.label}
    </span>
  )
}

export default function TenantChatConsole({ tenantId }: { tenantId: string }) {
  const [messages, setMessages] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<ChatTab>('direct')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const [chatTo, setChatTo] = useState('')
  const [chatMessage, setChatMessage] = useState('')
  const [broadcastRecipients, setBroadcastRecipients] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastTemplate, setBroadcastTemplate] = useState('')
  const [useTemplate, setUseTemplate] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [messageRows, templateRows, waStatus] = await Promise.all([
      getWhatsAppMessages(tenantId),
      getWhatsAppTemplates(tenantId),
      getWhatsAppStatus(tenantId),
    ])
    setMessages(messageRows.map((row: any) => ({ ...row, id: String(row.id) })))
    setTemplates(templateRows)
    setStatus(waStatus)
    setLoading(false)
  }, [tenantId])

  useEffect(() => {
    load()
  }, [load])

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3200)
  }

  function handleDirectMessage() {
    if (!chatTo.trim() || !chatMessage.trim()) return
    startTransition(async () => {
      const res: any = await sendWhatsAppMessage(tenantId, { to: chatTo, message: chatMessage })
      if (res.success) {
        showToast('Message sent successfully.', true)
        setChatMessage('')
      } else {
        showToast(res.apiResult?.error || 'Message delivery failed.', false)
      }
      await load()
    })
  }

  function handleBroadcast() {
    const recipients = broadcastRecipients.split(',').map(item => item.trim()).filter(Boolean)
    if (recipients.length === 0 || !broadcastMessage.trim()) return

    startTransition(async () => {
      const res: any = await sendWhatsAppBroadcast(tenantId, {
        templateName: broadcastTemplate || 'general_broadcast',
        recipients,
        message: broadcastMessage,
        useTemplate: useTemplate && !!broadcastTemplate,
      })
      if (res.success) {
        showToast(`Broadcast sent to ${res.successCount}/${recipients.length}.`, true)
        setBroadcastRecipients('')
        setBroadcastMessage('')
        setBroadcastTemplate('')
      } else {
        showToast('Broadcast failed. Check connector status and try again.', false)
      }
      await load()
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {toast && (
        <div style={{
          position: 'fixed',
          right: 18,
          bottom: 18,
          padding: '0.75rem 1rem',
          borderRadius: 12,
          background: toast.ok ? 'rgba(0,176,119,0.95)' : 'rgba(244,63,94,0.95)',
          color: '#fff',
          fontWeight: 800,
          boxShadow: '0 14px 40px rgba(0,0,0,0.22)',
          zIndex: 9999,
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ color: '#00B077', fontSize: '1.4rem' }}>chat</span>
              Chat Module
            </h1>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Tenant-level messaging workspace for direct conversations and campaign broadcasts.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '0.35rem 0.65rem',
              borderRadius: 999,
              background: status?.connected ? 'rgba(0,176,119,0.1)' : 'rgba(245,158,11,0.12)',
              color: status?.connected ? '#00B077' : '#f59e0b',
              fontSize: '0.75rem',
              fontWeight: 800,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor' }} />
              {status?.connected ? 'Connector Active' : 'Simulation Mode'}
            </span>
            <button
              type="button"
              onClick={() => load()}
              disabled={loading}
              style={{
                padding: '0.55rem 0.8rem',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--bg-raised)',
                color: 'var(--text-primary)',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Refresh
            </button>
          </div>
        </div>

        {status && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.9rem' }}>
            {status.phoneNumberId && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Phone ID: <strong style={{ color: 'var(--text-primary)' }}>{status.phoneNumberId}</strong>
              </span>
            )}
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Account: <strong style={{ color: 'var(--text-primary)' }}>{status.accountName || 'WhatsApp Business'}</strong>
            </span>
          </div>
        )}
      </div>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
          {[
            { key: 'direct' as const, label: 'Direct Chat', icon: 'chat' },
            { key: 'broadcast' as const, label: 'Broadcast', icon: 'cell_tower' },
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: '0.9rem',
                border: 'none',
                cursor: 'pointer',
                background: 'transparent',
                color: activeTab === tab.key ? '#00B077' : 'var(--text-muted)',
                borderBottom: activeTab === tab.key ? '2px solid #00B077' : '2px solid transparent',
                fontWeight: 800,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '1.25rem' }}>
          {activeTab === 'direct' ? (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <input
                value={chatTo}
                onChange={e => setChatTo(e.target.value)}
                placeholder="Recipient phone (+919876543210)"
                style={inputStyle}
              />
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <textarea
                  value={chatMessage}
                  onChange={e => setChatMessage(e.target.value)}
                  placeholder="Type a message..."
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical', flex: 1, minWidth: 260 }}
                />
                <button
                  type="button"
                  onClick={handleDirectMessage}
                  disabled={isPending || !chatTo.trim() || !chatMessage.trim()}
                  style={primaryButtonStyle(isPending)}
                >
                  {isPending ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <label style={helperLabelStyle}>
                <input type="checkbox" checked={useTemplate} onChange={e => setUseTemplate(e.target.checked)} />
                Use approved template for broadcast
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                {templates.length > 0 ? (
                  <select value={broadcastTemplate} onChange={e => setBroadcastTemplate(e.target.value)} style={inputStyle}>
                    <option value="">Select template...</option>
                    {templates.map((template: any) => (
                      <option key={template.name} value={template.name}>
                        {template.name} ({template.status})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={broadcastTemplate}
                    onChange={e => setBroadcastTemplate(e.target.value)}
                    placeholder="Template name"
                    style={inputStyle}
                  />
                )}

                <input
                  value={broadcastRecipients}
                  onChange={e => setBroadcastRecipients(e.target.value)}
                  placeholder="+91..., +91..., +91..."
                  style={inputStyle}
                />
              </div>

              <textarea
                value={broadcastMessage}
                onChange={e => setBroadcastMessage(e.target.value)}
                placeholder="Broadcast message content..."
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
              />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {broadcastRecipients.split(',').map(item => item.trim()).filter(Boolean).length} recipients
                </span>
                <button
                  type="button"
                  onClick={handleBroadcast}
                  disabled={isPending || !broadcastRecipients.trim() || !broadcastMessage.trim() || (useTemplate && !broadcastTemplate)}
                  style={primaryButtonStyle(isPending)}
                >
                  {isPending ? 'Sending...' : 'Send Broadcast'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center', marginBottom: '0.9rem', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: 'var(--text-primary)' }}>Conversation History</h2>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Latest tenant chat and broadcast events stored in the workspace.
            </p>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#00B077' }}>
            {messages.length} events
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading message history...</div>
        ) : messages.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No chat activity yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: 480, overflowY: 'auto' }}>
            {messages.map(message => {
              const payload: any = message.payload || {}
              const isBroadcast = payload.type === 'broadcast'
              const isDirect = payload.type === 'outgoing_message'
              return (
                <div
                  key={message.publicId}
                  style={{
                    padding: '0.9rem 1rem',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    background: isBroadcast ? 'rgba(0,176,119,0.05)' : isDirect ? 'rgba(16,185,129,0.05)' : 'var(--bg-raised)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                    <p style={{ margin: 0, fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.8125rem' }}>
                      {isBroadcast
                        ? `Broadcast to ${payload.recipientCount || 0} recipients`
                        : `Direct chat to ${payload.to || 'Unknown recipient'}`}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                      {payload.via === 'whatsapp_cloud_api' && (
                        <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#00B077' }}>Live API</span>
                      )}
                      <StatusPill status={message.status} />
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                        {new Date(message.createdAt).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {payload.message || JSON.stringify(payload)}
                  </p>
                  {payload.error && (
                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: '#f43f5e', fontWeight: 700 }}>
                      {payload.error}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '0.75rem 1rem',
  borderRadius: 10,
  background: 'var(--bg-raised)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
  fontSize: '0.9375rem',
  outline: 'none',
  boxSizing: 'border-box',
}

const helperLabelStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  color: 'var(--text-secondary)',
  fontSize: '0.8125rem',
  fontWeight: 700,
}

function primaryButtonStyle(isPending: boolean): CSSProperties {
  return {
    padding: '0.75rem 1.1rem',
    borderRadius: 10,
    border: 'none',
    background: '#00B077',
    color: '#fff',
    fontWeight: 800,
    cursor: isPending ? 'not-allowed' : 'pointer',
    opacity: isPending ? 0.7 : 1,
    minWidth: 160,
  }
}
