'use client'

import { loginAction, type AuthState } from '@/actions/auth'
import { useActionState, useEffect, useState } from 'react'
import { GOOGLE_ERROR_MESSAGES } from '@/lib/google-auth'
import { signIn } from 'next-auth/react'

export default function LoginPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(loginAction, undefined)
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [googleHint, setGoogleHint] = useState<string | null>(null)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Read ?error= and ?hint= query params from Google OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const err = params.get('error')
    const hint = params.get('hint')
    if (err && GOOGLE_ERROR_MESSAGES[err]) {
      setGoogleError(GOOGLE_ERROR_MESSAGES[err])
    }
    if (hint) setGoogleHint(hint)
  }, [])

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    try {
      await signIn('google-login', { callbackUrl: '/dashboard' })
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="orb orb-1" aria-hidden />
      <div className="orb orb-2" aria-hidden />

      <div className="login-card glass fade-in">
        {/* Logo */}
        <div className="login-logo" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <img src="/logo.svg" alt="Nixvra" style={{ height: 40, width: 'auto' }} />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.25rem', textAlign: 'center' }}>
            Sign in to Nixvra
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            Use your email or Google account to access your workspace
          </p>
        </div>

        {/* Google OAuth Error */}
        {googleError && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
            padding: '0.875rem 1rem', marginBottom: '1rem',
            background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)',
            borderRadius: 10,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="1" fill="#f43f5e"/>
            </svg>
            <div>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#f43f5e' }}>{googleError}</p>
              {googleHint && (
                <p style={{ margin: '0.375rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Google account used:{' '}
                  <strong style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{googleHint}</strong>
                  <br />
                  Make sure this email exists in your workspace user list.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Email/password errors */}
        {state?.errors?.general && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }} role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            {state.errors.general[0]}
          </div>
        )}

        {/* ─── Google Sign-In Button ─── */}
        <button
          id="google-login-btn"
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading || pending}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '0.75rem', padding: '0.75rem 1rem', marginBottom: '1.25rem',
            borderRadius: 12, border: '1px solid var(--border)',
            background: 'var(--bg-raised)', cursor: 'pointer',
            fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)',
            transition: 'all 200ms',
            opacity: googleLoading ? 0.75 : 1,
          }}
        >
          {googleLoading ? (
            <div style={{
              width: 18, height: 18, borderRadius: '50%',
              border: '2px solid var(--border)', borderTopColor: '#00B077',
              animation: 'spin 0.7s linear infinite',
            }} />
          ) : (
            /* Google 'G' SVG */
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {googleLoading ? 'Redirecting to Google...' : 'Continue with Google'}
        </button>

        {/* Divider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem',
        }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>OR</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {/* ─── Email / Password Form ─── */}
        <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              className="form-input"
              aria-describedby={state?.errors?.email ? 'email-error' : undefined}
              aria-invalid={!!state?.errors?.email}
            />
            {state?.errors?.email && (
              <span id="email-error" className="form-error">{state.errors.email[0]}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="form-input"
              aria-describedby={state?.errors?.password ? 'pw-error' : undefined}
              aria-invalid={!!state?.errors?.password}
            />
            {state?.errors?.password && (
              <span id="pw-error" className="form-error">{state.errors.password[0]}</span>
            )}
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            disabled={pending || googleLoading}
            className="btn btn-primary btn-lg btn-full"
            style={{ marginTop: '0.25rem' }}
          >
            {pending ? (
              <>
                <div className="spinner" style={{ width: 16, height: 16 }} />
                Signing in...
              </>
            ) : (
              <>
                Sign in with Email
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </>
            )}
          </button>
        </form>

        <p className="login-hint">
          Protected workspace. Contact your administrator for access.
        </p>
      </div>

      <style>{`
        .login-page {
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          background: var(--bg-base);
          position: relative;
          overflow: hidden;
        }
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          z-index: 0;
        }
        .orb-1 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(0,176,119,0.12) 0%, transparent 70%);
          top: -150px; left: -100px;
        }
        .orb-2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(0,142,96,0.1) 0%, transparent 70%);
          bottom: -100px; right: -50px;
        }
        .login-card {
          width: 100%;
          max-width: 440px;
          padding: 2.5rem;
          position: relative;
          z-index: 1;
        }
        .login-logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.75rem;
        }
        .login-hint {
          text-align: center;
          margin-top: 1.25rem;
          font-size: 0.75rem;
          color: var(--text-muted);
          line-height: 1.5;
        }
        #google-login-btn:hover:not(:disabled) {
          background: var(--bg-overlay, rgba(255,255,255,0.05));
          border-color: rgba(0,176,119,0.4);
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
