'use client'

import React, { useState } from 'react'
import { connectIntegration, disconnectIntegration, testIntegration, type PlatformType } from '@/actions/master-integrations'
import ConnectionStatusBadge from './ConnectionStatusBadge'
import Link from 'next/link'

/* ─── Platform metadata registry (extensible) ─── */
export const PLATFORM_META: Record<string, {
  label: string
  icon: string
  color: string
  category: 'social' | 'email' | 'telephony' | 'payment' | 'analytics'
  description: string
  authType: 'oauth' | 'apikey' | 'smtp' | 'ivrs'
  fields: { key: string; label: string; type: string; placeholder: string; required: boolean }[]
}> = {
  YOUTUBE_DATA: {
    label: 'YouTube',
    icon: '▶',
    color: '#FF0000',
    category: 'social',
    description: 'Publish videos, manage channel, read analytics.',
    authType: 'apikey',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'AIza...', required: true },
      { key: 'accessToken', label: 'OAuth Access Token (optional)', type: 'password', placeholder: 'ya29...', required: false },
      { key: 'channelId', label: 'Channel ID', type: 'text', placeholder: 'UCxxxxx', required: false },
    ],
  },
  TWITTER: {
    label: 'X (Twitter)',
    icon: '𝕏',
    color: '#000000',
    category: 'social',
    description: 'Post tweets, read mentions, manage DMs.',
    authType: 'oauth',
    fields: [
      { key: 'accessToken', label: 'Bearer Token', type: 'password', placeholder: 'AAAAAA...', required: true },
      { key: 'apiKey', label: 'API Key (v2)', type: 'password', placeholder: 'eXV...', required: false },
      { key: 'refreshToken', label: 'OAuth 2.0 Refresh Token', type: 'password', placeholder: '', required: false },
    ],
  },
  LINKEDIN: {
    label: 'LinkedIn',
    icon: 'in',
    color: '#0A66C2',
    category: 'social',
    description: 'Post to pages, share updates, analyze reach.',
    authType: 'oauth',
    fields: [
      { key: 'accessToken', label: 'OAuth 2.0 Access Token', type: 'password', placeholder: 'AQX...', required: true },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password', placeholder: '', required: false },
      { key: 'organizationId', label: 'Organization URN', type: 'text', placeholder: 'urn:li:organization:1234', required: false },
    ],
  },
  SMTP: {
    label: 'SMTP Email',
    icon: '✉',
    color: '#00B077',
    category: 'email',
    description: 'Send transactional emails via any SMTP server.',
    authType: 'smtp',
    fields: [
      { key: 'smtpHost', label: 'SMTP Host', type: 'text', placeholder: 'smtp.gmail.com', required: true },
      { key: 'smtpPort', label: 'Port', type: 'text', placeholder: '587', required: true },
      { key: 'smtpUser', label: 'Username / Email', type: 'text', placeholder: 'hello@domain.com', required: true },
      { key: 'apiKey', label: 'Password / App Password', type: 'password', placeholder: 'App password here', required: true },
      { key: 'smtpFrom', label: 'From Name', type: 'text', placeholder: 'Nixvra', required: false },
    ],
  },
  GMAIL: {
    label: 'Gmail (OAuth2)',
    icon: 'G',
    color: '#EA4335',
    category: 'email',
    description: 'Send emails using Gmail OAuth2 — no password needed.',
    authType: 'oauth',
    fields: [
      { key: 'accessToken', label: 'OAuth2 Access Token', type: 'password', placeholder: 'ya29...', required: true },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password', placeholder: '1//0e...', required: true },
      { key: 'clientId', label: 'Client ID', type: 'text', placeholder: 'xxxx.apps.googleusercontent.com', required: false },
    ],
  },
  IVRS: {
    label: 'IVRS / Telephony',
    icon: '☎',
    color: '#10b981',
    category: 'telephony',
    description: 'Automated calls, IVR menus, Twilio / Exotel / any Indian provider.',
    authType: 'ivrs',
    fields: [
      { key: 'ivrsProvider', label: 'Provider', type: 'select', placeholder: 'Twilio', required: true },
      { key: 'apiKey', label: 'Account SID / API Key', type: 'password', placeholder: 'ACxxxx', required: true },
      { key: 'accessToken', label: 'Auth Token', type: 'password', placeholder: '', required: true },
      { key: 'virtualNumber', label: 'Virtual Number', type: 'text', placeholder: '+918000000000', required: false },
    ],
  },
  META_GRAPH: {
    label: 'Meta (Facebook)',
    icon: 'f',
    color: '#1877F2',
    category: 'social',
    description: 'Facebook Pages, Instagram, Meta Ads.',
    authType: 'oauth',
    fields: [
      { key: 'appId', label: 'Meta App ID', type: 'text', placeholder: '123456...', required: true },
      { key: 'appSecret', label: 'Meta App Secret', type: 'password', placeholder: 'xxxx...', required: true },
      { key: 'accessToken', label: 'System/Page Access Token', type: 'password', placeholder: 'EAAxx...', required: true },
      { key: 'webhookUrl', label: 'Webhook Verify Token (optional)', type: 'text', placeholder: 'my_verify_token', required: false },
    ],
  },
  WHATSAPP_CLOUD: {
    label: 'WhatsApp Business',
    icon: '💬',
    color: '#25d366',
    category: 'social',
    description: 'WhatsApp Cloud API — messages, broadcasts.',
    authType: 'oauth',
    fields: [
      { key: 'accessToken', label: 'System Access Token', type: 'password', placeholder: 'EAAxx...', required: true },
      { key: 'apiKey', label: 'Phone Number ID', type: 'text', placeholder: '1234567890', required: true },
      { key: 'whatsappBusinessAccountId', label: 'WABA ID', type: 'text', placeholder: '1234567890', required: true },
    ],
  },
}

/* ─── Props ─── */
type Props = {
  provider: string
  tenantId: string
  tenantName: string
  isConnected: boolean
  isActive: boolean
  connectedAt: string | null
  compact?: boolean
  onRefresh?: () => void
}

/* ═══════════════════════════════════════════════════════════════
   INTEGRATION CARD
   ═══════════════════════════════════════════════════════════════ */
export default function IntegrationCard({
  provider, tenantId, tenantName, isConnected, isActive, connectedAt, compact = false, onRefresh,
}: Props) {
  const meta = PLATFORM_META[provider] || {
    label: provider, icon: '⚙', color: '#00B077', description: 'Third-party integration.',
    authType: 'apikey', fields: [],
  }

  const [showForm, setShowForm]       = useState(false)
  const [testing,  setTesting]        = useState(false)
  const [testResult, setTestResult]   = useState<{ ok: boolean; message: string; latencyMs?: number } | null>(null)
  const [pending,  setPending]        = useState(false)
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null)
  const [formValues, setFormValues]   = useState<Record<string, string>>({})

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  function handleFormChange(key: string, value: string) {
    setFormValues(prev => ({ ...prev, [key]: value }))
  }

  async function handleConnect() {
    setPending(true)
    try {
      // Build payload based on authType
      const payload: Record<string, unknown> = { tenantId, platform: provider }
      const meta_obj: Record<string, unknown> = {}

      meta.fields.forEach(f => {
        const val = formValues[f.key]?.trim()
        if (!val) return
        if (f.key === 'accessToken') payload['accessToken'] = val
        else if (f.key === 'apiKey') payload['apiKey'] = val
        else if (f.key === 'refreshToken') payload['refreshToken'] = val
        else if (f.key === 'webhookUrl') payload['webhookUrl'] = val
        else meta_obj[f.key] = val
      })

      if (Object.keys(meta_obj).length > 0) payload['metadata'] = meta_obj

      const res = await connectIntegration(payload as Parameters<typeof connectIntegration>[0])
      showToast(res.message, res.success)
      if (res.success) { setShowForm(false); onRefresh?.() }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Connection failed', false)
    } finally {
      setPending(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm(`Disconnect ${meta.label} from ${tenantName}? This will clear all stored credentials.`)) return
    setPending(true)
    try {
      const res = await disconnectIntegration(tenantId, provider as PlatformType)
      showToast(res.message, res.success)
      onRefresh?.()
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Disconnect failed', false)
    } finally {
      setPending(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await testIntegration(tenantId, provider as PlatformType)
      setTestResult(res)
    } catch (err: unknown) {
      setTestResult({ ok: false, message: err instanceof Error ? err.message : 'Test failed' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: `1px solid ${isConnected && isActive ? `${meta.color}30` : 'var(--border)'}`,
      borderTop: `3px solid ${isConnected && isActive ? meta.color : 'var(--border)'}`,
      borderRadius: 16, padding: compact ? '1rem' : '1.25rem',
      display: 'flex', flexDirection: 'column', gap: '0.75rem',
      transition: 'all 200ms', position: 'relative',
    }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: toast.ok ? 'rgba(16,185,129,0.95)' : 'rgba(244,63,94,0.95)',
          color: '#fff', padding: '0.75rem 1.25rem', borderRadius: 12,
          fontWeight: 600, fontSize: '0.875rem',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: `${meta.color}18`, border: `1px solid ${meta.color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem', fontWeight: 900, color: meta.color,
          }}>
            {meta.icon}
          </div>
          <div>
            <p style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--text-primary)', margin: 0 }}>
              {meta.label}
            </p>
            {connectedAt && isConnected && (
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: 0 }}>
                Connected {new Date(connectedAt).toLocaleDateString('en-IN')}
              </p>
            )}
          </div>
        </div>
        <ConnectionStatusBadge isActive={isActive} hasCredentials={isConnected} />
      </div>

      {/* Description */}
      {!compact && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
          {meta.description}
        </p>
      )}

      {/* Test result */}
      {testResult && (
        <div style={{
          padding: '0.625rem 0.875rem', borderRadius: 8, fontSize: '0.8125rem',
          background: testResult.ok ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)',
          border: `1px solid ${testResult.ok ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}`,
          color: testResult.ok ? '#10b981' : '#f43f5e',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>{testResult.message}</span>
          {testResult.latencyMs !== undefined && (
            <span style={{ fontSize: '0.6875rem', opacity: 0.7 }}>{testResult.latencyMs}ms</span>
          )}
        </div>
      )}

      {/* Connection Form */}
      {showForm && (
        <div style={{
          background: 'var(--bg-raised)', borderRadius: 12,
          border: '1px solid var(--border)', padding: '1rem',
          display: 'flex', flexDirection: 'column', gap: '0.75rem',
        }}>
          <p style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-primary)', margin: 0 }}>
            Connect {meta.label}
          </p>
          {meta.fields.map(f => (
            <div key={f.key}>
              <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {f.label}{f.required && <span style={{ color: '#f43f5e' }}> *</span>}
              </label>
              {f.key === 'ivrsProvider' ? (
                <select
                  className="form-input"
                  value={formValues[f.key] || ''}
                  onChange={e => handleFormChange(f.key, e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">Select Provider</option>
                  <option value="Twilio">Twilio</option>
                  <option value="Exotel">Exotel</option>
                  <option value="Knowlarity">Knowlarity</option>
                  <option value="Servetel">Servetel</option>
                  <option value="MyOperator">MyOperator</option>
                  <option value="Custom">Custom</option>
                </select>
              ) : (
                <input
                  type={f.type}
                  placeholder={f.placeholder}
                  value={formValues[f.key] || ''}
                  onChange={e => handleFormChange(f.key, e.target.value)}
                  className="form-input"
                  style={{ width: '100%', boxSizing: 'border-box', fontFamily: f.type === 'password' ? 'monospace' : 'inherit' }}
                />
              )}
            </div>
          ))}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowForm(false)}
              className="btn"
              style={{ padding: '0.45rem 0.875rem', fontSize: '0.8125rem', background: 'var(--bg-overlay)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleConnect}
              disabled={pending}
              className="btn btn-primary"
              style={{ padding: '0.45rem 0.875rem', fontSize: '0.8125rem', background: meta.color }}
            >
              {pending ? 'Connecting...' : `Connect ${meta.label}`}
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!showForm && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {!isConnected ? (
            <button
              onClick={() => setShowForm(true)}
              className="btn btn-primary"
              style={{ flex: 1, padding: '0.45rem 0.75rem', fontSize: '0.8125rem', background: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add_link</span>
              Connect
            </button>
          ) : (
            <>
              <button
                onClick={handleTest}
                disabled={testing}
                className="btn"
                style={{ flex: 1, padding: '0.45rem 0.75rem', fontSize: '0.8125rem', background: 'var(--bg-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>
                  {testing ? 'sync' : 'electrical_services'}
                </span>
                {testing ? 'Testing...' : 'Test'}
              </button>

              {(provider === 'META_GRAPH' || provider === 'WHATSAPP_CLOUD') && (
                <Link 
                  href="/dashboard/marketing" 
                  style={{ 
                    flex: 1, padding: '0.45rem 0.75rem', fontSize: '0.8125rem', 
                    background: `${meta.color}12`, color: meta.color, 
                    border: `1px solid ${meta.color}30`, borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    textDecoration: 'none', fontWeight: 700
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>rocket_launch</span>
                  Open Hub
                </Link>
              )}
              <button
                onClick={() => setShowForm(true)}
                className="btn"
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.8125rem', background: 'var(--bg-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>edit</span>
                Update
              </button>
              <button
                onClick={handleDisconnect}
                disabled={pending}
                className="btn"
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.8125rem', background: 'rgba(244,63,94,0.08)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)', display: 'flex', alignItems: 'center', gap: 3 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>link_off</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
