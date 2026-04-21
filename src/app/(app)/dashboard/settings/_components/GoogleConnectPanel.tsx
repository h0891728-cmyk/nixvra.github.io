'use client'

import { useState, useTransition, useEffect } from 'react'
import { toggleGoogleLoginAction, disconnectGoogleAction } from '@/actions/tenant-google-settings'

type GoogleStatus = {
  isConnected: boolean
  email?: string
  googleAccountId?: string
  loginEnabled?: boolean
  connectedAt?: string
  updatedAt?: string
}

export default function GoogleConnectPanel({
  status,
  tenantId,
  isAdmin,
}: {
  status: GoogleStatus
  tenantId: string
  isAdmin: boolean
}) {
  const [current, setCurrent] = useState(status)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function handleConnect() {
    // Trigger NextAuth Google OAuth - JWT callback will use nixvra_session.tenantId
    // to save the integration automatically
    window.location.href = '/api/auth/signin/google?callbackUrl=/dashboard/settings'
  }

  function handleToggle(enabled: boolean) {
    setError(null)
    startTransition(async () => {
      const result = await toggleGoogleLoginAction(enabled)
      if (result.success) {
        setCurrent(prev => ({ ...prev, loginEnabled: enabled }))
        showToast(enabled ? 'Google login enabled for your workspace.' : 'Google login disabled.')
      } else {
        setError(result.error ?? 'Failed to update')
      }
    })
  }

  function handleDisconnect() {
    if (!confirm('Disconnect Google from this workspace? Users will no longer be able to sign in with Google.')) return
    setError(null)
    startTransition(async () => {
      const result = await disconnectGoogleAction()
      if (result.success) {
        setCurrent({ isConnected: false, loginEnabled: false })
        showToast('Google account disconnected.')
      } else {
        setError(result.error ?? 'Failed to disconnect')
      }
    })
  }

  const connectedDate = current.connectedAt
    ? new Date(current.connectedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 16, padding: '1.5rem', position: 'relative', overflow: 'hidden',
    }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'absolute', top: '1rem', right: '1rem',
          padding: '0.5rem 1rem', borderRadius: 8,
          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
          color: '#10b981', fontSize: '0.8125rem', fontWeight: 600,
          animation: 'fadeIn 200ms ease',
        }}>
          ✓ {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.25rem' }}>
        {/* Google G icon */}
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: current.isConnected ? 'rgba(66,133,244,0.1)' : 'var(--bg-raised)',
          border: `1px solid ${current.isConnected ? 'rgba(66,133,244,0.25)' : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Google Social Login
          </h3>
          <p style={{ margin: '0.125rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Allow workspace users to sign in with their Google account
          </p>
        </div>
        {/* Connection status badge */}
        <span style={{
          fontSize: '0.6875rem', fontWeight: 700, padding: '0.25rem 0.625rem',
          borderRadius: 999, flexShrink: 0,
          background: current.isConnected ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.08)',
          color: current.isConnected ? '#10b981' : '#f43f5e',
          border: `1px solid ${current.isConnected ? 'rgba(16,185,129,0.25)' : 'rgba(244,63,94,0.2)'}`,
        }}>
          {current.isConnected ? '● Connected' : '○ Not Connected'}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '0.75rem 1rem', marginBottom: '1rem', borderRadius: 10,
          background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)',
          fontSize: '0.8125rem', color: '#f43f5e',
        }}>
          {error}
        </div>
      )}

      {/* ─── Not Connected State ─── */}
      {!current.isConnected && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{
            padding: '1rem', borderRadius: 12,
            background: 'var(--bg-raised)', border: '1px solid var(--border)',
            fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.6,
          }}>
            <p style={{ margin: '0 0 0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              How it works
            </p>
            <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
              <li>Connect a Google account to your workspace</li>
              <li>Users whose email matches a Google account can then sign in with <strong style={{ color: 'var(--text-primary)' }}>1-click</strong></li>
              <li>Email must already exist in your workspace user list</li>
              <li>You can disable it anytime without disconnecting</li>
            </ul>
          </div>
          {isAdmin && (
            <button
              onClick={handleConnect}
              disabled={isPending}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                padding: '0.75rem 1.25rem', borderRadius: 12,
                background: 'var(--bg-raised)', border: '1px solid var(--border)',
                cursor: 'pointer', fontSize: '0.9375rem', fontWeight: 600,
                color: 'var(--text-primary)', transition: 'all 200ms',
                width: '100%',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Connect Google Account
            </button>
          )}
        </div>
      )}

      {/* ─── Connected State ─── */}
      {current.isConnected && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Account info card */}
          <div style={{
            padding: '1rem 1.25rem', borderRadius: 12,
            background: 'rgba(66,133,244,0.06)', border: '1px solid rgba(66,133,244,0.2)',
            display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
          }}>
            {/* Avatar */}
            <div style={{
              width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #4285F4, #34A853)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.125rem', fontWeight: 900, color: '#fff',
            }}>
              {current.email?.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {current.email}
              </p>
              <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Connected {connectedDate} · ID: {current.googleAccountId?.slice(0, 8)}...
              </p>
            </div>
            <span style={{
              fontSize: '0.6875rem', fontWeight: 700, padding: '0.2rem 0.5rem',
              borderRadius: 999, background: 'rgba(66,133,244,0.12)',
              color: '#4285F4', border: '1px solid rgba(66,133,244,0.25)',
              flexShrink: 0,
            }}>
              Google Account
            </span>
          </div>

          {/* Enable / Disable toggle */}
          {isAdmin && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '1rem 1.25rem', borderRadius: 12,
              background: 'var(--bg-raised)', border: '1px solid var(--border)',
              gap: '1rem', flexWrap: 'wrap',
            }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  Allow Google Sign-In
                </p>
                <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {current.loginEnabled
                    ? 'Users can sign in using their Google account'
                    : 'Google sign-in is blocked for all users'}
                </p>
              </div>
              {/* Toggle switch */}
              <button
                onClick={() => handleToggle(!current.loginEnabled)}
                disabled={isPending}
                aria-checked={current.loginEnabled}
                role="switch"
                style={{
                  position: 'relative', width: 48, height: 28, borderRadius: 999,
                  border: 'none', cursor: isPending ? 'wait' : 'pointer',
                  background: current.loginEnabled ? '#10b981' : 'var(--border)',
                  transition: 'background 250ms', flexShrink: 0,
                  padding: 0,
                }}
              >
                <span style={{
                  position: 'absolute', top: 3, width: 22, height: 22, borderRadius: '50%',
                  background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                  transition: 'left 250ms',
                  left: current.loginEnabled ? '23px' : '3px',
                }} />
              </button>
            </div>
          )}

          {/* Read-only status for non-admins */}
          {!isAdmin && (
            <div style={{
              padding: '0.875rem 1.25rem', borderRadius: 12,
              background: 'var(--bg-raised)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
            }}>
              <span className="material-symbols-outlined" style={{ color: current.loginEnabled ? '#10b981' : '#f59e0b', fontSize: '1.1rem' }}>
                {current.loginEnabled ? 'check_circle' : 'pause_circle'}
              </span>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Google Sign-In is currently <strong style={{ color: current.loginEnabled ? '#10b981' : '#f59e0b' }}>
                  {current.loginEnabled ? 'enabled' : 'disabled'}
                </strong> for this workspace.
              </p>
            </div>
          )}

          {/* Disconnect */}
          {isAdmin && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.875rem 1.25rem', borderRadius: 12,
              background: 'rgba(244,63,94,0.04)', border: '1px solid rgba(244,63,94,0.12)',
              gap: '1rem', flexWrap: 'wrap',
            }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: '#f43f5e' }}>
                  Disconnect Google
                </p>
                <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Removes the link — users won't be able to sign in with Google
                </p>
              </div>
              <button
                onClick={handleDisconnect}
                disabled={isPending}
                style={{
                  padding: '0.5rem 1rem', borderRadius: 8,
                  background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)',
                  color: '#f43f5e', fontWeight: 700, fontSize: '0.8125rem',
                  cursor: 'pointer', flexShrink: 0,
                  opacity: isPending ? 0.6 : 1,
                }}
              >
                {isPending ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
