'use client'

import { useActionState, useState } from 'react'
import { changeEmailAction, changePasswordAction, type ProfileActionState } from '@/actions/user-profile'
import { logoutAction } from '@/actions/auth'
import Link from 'next/link'
import GoogleConnectPanel from './GoogleConnectPanel'

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', color: '#f59e0b' },
  TENANT_ADMIN: { label: 'Workspace Admin', color: '#00B077' },
  STAFF: { label: 'Staff Member', color: '#10b981' },
  CUSTOMER: { label: 'Customer', color: '#06b6d4' },
}

const PLAN_COLORS: Record<string, string> = {
  TRIAL: '#5a5a78', BASIC: '#06b6d4', PRO: '#00B077', ENTERPRISE: '#f59e0b',
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#10b981', TRIAL: '#00B077', EXPIRED: '#f43f5e',
  CANCELLED: '#f43f5e', SUSPENDED: '#f59e0b',
}

type Profile = {
  user: { publicId: string; email: string; role: string; createdAt: string }
  linkedProfile: { publicId: string; name: string; type: string; contact: string | null } | null
  tenant: {
    id: string
    name: string
    subdomain: string
    plan: string
    planStatus: string
    modules: string[]
    entitledModules: string[]
    services: Record<string, boolean>
    enabledServiceCount: number
  }
  google: {
    isConnected: boolean
    email?: string
    googleAccountId?: string
    loginEnabled?: boolean
    connectedAt?: string
  }
}

export default function ProfileSettingsClient({ profile }: { profile: Profile }) {
  const [pwState, pwAction, pwPending] = useActionState<ProfileActionState, FormData>(changePasswordAction, undefined)
  const [emailState, emailAction, emailPending] = useActionState<ProfileActionState, FormData>(changeEmailAction, undefined)
  const [showPw, setShowPw] = useState(false)
  const [showEmail, setShowEmail] = useState(false)

  const roleInfo = ROLE_LABELS[profile.user.role] ?? { label: profile.user.role, color: '#5a5a78' }
  const memberSince = new Date(profile.user.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ─── Page Header ─── */}
      <header>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="material-symbols-outlined" style={{ color: '#00B077', fontSize: '1.5rem' }}>manage_accounts</span>
          Profile & Settings
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', margin: 0 }}>
          Manage your account, security, and workspace information.
        </p>
      </header>

      {/* ─── Identity Card ─── */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        {/* Avatar */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #00B077, #008E60)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.75rem', fontWeight: 900, color: '#fff',
        }}>
          {profile.user.email.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
            {profile.linkedProfile && (
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {profile.linkedProfile.name}
              </h2>
            )}
            <span style={{
              fontSize: '0.6875rem', fontWeight: 700, padding: '0.2rem 0.5rem',
              borderRadius: 999, background: `${roleInfo.color}15`, color: roleInfo.color,
            }}>{roleInfo.label}</span>
          </div>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', margin: 0 }}>{profile.user.email}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
            Member since {memberSince}
          </p>
        </div>

        {/* Linked profile badge */}
        {profile.linkedProfile && (
          <Link
            href={`/dashboard/modules/${profile.linkedProfile.publicId}`}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 0.875rem', borderRadius: 10,
              background: 'rgba(0,176,119,0.1)', border: '1px solid rgba(0,176,119,0.25)',
              color: '#00B077', fontSize: '0.8125rem', fontWeight: 700, textDecoration: 'none',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>open_in_new</span>
            View Profile
          </Link>
        )}
      </div>

      {/* ─── Workspace Info ─── */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 1.25rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: '#008E60' }}>corporate_fare</span>
          Workspace
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          {[
            { label: 'Workspace', value: profile.tenant.name },
            { label: 'Subdomain', value: `${profile.tenant.subdomain}.nixvra.online` },
            { label: 'Plan', value: profile.tenant.plan, color: PLAN_COLORS[profile.tenant.plan] },
            { label: 'Status', value: profile.tenant.planStatus, color: STATUS_COLORS[profile.tenant.planStatus] },
            { label: 'Enabled Services', value: String(profile.tenant.enabledServiceCount), color: '#00B077' },
          ].map(item => (
            <div key={item.label} style={{ padding: '0.875rem', background: 'var(--bg-raised)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.25rem' }}>{item.label}</p>
              <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: item.color ?? 'var(--text-primary)', margin: 0 }}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* Active modules */}
        <div>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.625rem' }}>
            Active Modules ({profile.tenant.modules.length})
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {profile.tenant.modules.length === 0
              ? <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>No modules active</span>
              : profile.tenant.modules.map(m => (
                <span key={m} style={{
                  fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.625rem',
                  background: 'rgba(0,176,119,0.1)', color: '#00B077',
                  border: '1px solid rgba(0,176,119,0.2)', borderRadius: 999,
                }}>{m}</span>
              ))
            }
          </div>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.625rem' }}>
            Service Controls
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {Object.entries(profile.tenant.services).filter(([, enabled]) => enabled !== false).length === 0
              ? <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Using default service state</span>
              : Object.entries(profile.tenant.services)
                .filter(([, enabled]) => enabled !== false)
                .map(([key]) => (
                  <span key={key} style={{
                    fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.625rem',
                    background: 'rgba(17,17,17,0.05)', color: 'var(--text-primary)',
                    border: '1px solid var(--border)', borderRadius: 999,
                  }}>{key}</span>
                ))
            }
          </div>
        </div>
      </div>

      {/* ─── Workspace Panels ─── */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 1.25rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: '#00B077' }}>dashboard_customize</span>
          Workspace Panels
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
          {[
            { href: '/dashboard/settings/services', icon: 'tune', title: 'Services Management', desc: 'Enable/disable CRM, ERP, Social Hub, Marketing, YouTube.' },
            { href: '/dashboard/settings/landing', icon: 'language', title: 'Landing Page Settings', desc: 'Logo, colors, hero content, SEO, custom sections.' },
            { href: '/dashboard/settings/social-marketing', icon: 'campaign', title: 'Social & Marketing Panel', desc: 'Connect channels and manage marketing access.' },
            { href: '/dashboard/chat', icon: 'chat', title: 'Chat Workspace', desc: 'Direct chat, broadcast messaging, and tenant conversations.' },
          ].map(card => (
            <Link
              key={card.href}
              href={card.href}
              style={{
                textDecoration: 'none',
                background: 'var(--bg-raised)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: '1rem',
                display: 'flex',
                gap: '0.875rem',
                alignItems: 'flex-start',
                transition: 'transform 180ms, border-color 180ms',
              }}
              onMouseEnter={e => {
                ; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(0,176,119,0.35)'
                  ; (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                ; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)'
                  ; (e.currentTarget as HTMLAnchorElement).style.transform = 'none'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.35rem', color: '#00B077', marginTop: 1 }}>
                {card.icon}
              </span>
              <div>
                <p style={{ margin: 0, fontWeight: 900, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>{card.title}</p>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem', lineHeight: 1.5 }}>{card.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ─── Google Social Login Panel ─── */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: '#00B077' }}>alternate_email</span>
            Update Email
          </h3>
          <button
            type="button"
            onClick={() => setShowEmail(v => !v)}
            style={{
              fontSize: '0.8125rem', fontWeight: 600, color: '#00B077', cursor: 'pointer',
              background: 'none', border: 'none', padding: 0,
            }}
          >
            {showEmail ? 'Hide' : 'Change Email'}
          </button>
        </div>

        {showEmail ? (
          <form action={emailAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {emailState?.error && (
              <div style={{
                padding: '0.75rem 1rem', borderRadius: 10,
                background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)',
                fontSize: '0.8125rem', color: '#f43f5e',
              }}>
                {emailState.error}
              </div>
            )}
            {emailState?.success && (
              <div style={{
                padding: '0.75rem 1rem', borderRadius: 10,
                background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                fontSize: '0.8125rem', color: '#10b981', fontWeight: 600,
              }}>
                Email updated successfully.
              </div>
            )}

            {[
              { id: 'newEmail', label: 'New Email', type: 'email', auto: 'email', placeholder: 'name@company.com' },
              { id: 'confirmEmail', label: 'Confirm Email', type: 'email', auto: 'email', placeholder: 'name@company.com' },
              { id: 'password', label: 'Current Password', type: 'password', auto: 'current-password', placeholder: 'Enter password to confirm' },
            ].map(f => (
              <div key={f.id}>
                <label htmlFor={f.id} style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
                  {f.label}
                </label>
                <input
                  id={f.id}
                  name={f.id}
                  type={f.type}
                  autoComplete={f.auto}
                  placeholder={f.placeholder}
                  style={{
                    width: '100%', padding: '0.75rem 1rem', borderRadius: 10,
                    background: 'var(--bg-raised)', border: '1px solid var(--border)',
                    color: 'var(--text-primary)', fontSize: '0.9375rem', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={emailPending}
              style={{
                padding: '0.75rem', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #00B077, #008E60)',
                color: '#fff', fontWeight: 700, cursor: 'pointer',
                opacity: emailPending ? 0.7 : 1, transition: 'opacity 200ms',
              }}
            >
              {emailPending ? 'Updating...' : 'Update Email'}
            </button>
          </form>
        ) : (
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
            Current login email: <strong style={{ color: 'var(--text-primary)' }}>{profile.user.email}</strong>
          </p>
        )}
      </div>

      <GoogleConnectPanel
        status={profile.google}
        tenantId={profile.tenant.id}
        isAdmin={profile.user.role === 'TENANT_ADMIN' || profile.user.role === 'SUPER_ADMIN'}
      />

      {/* ─── Change Password ─── */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: '#f59e0b' }}>lock</span>
            Change Password
          </h3>
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            style={{
              fontSize: '0.8125rem', fontWeight: 600, color: '#00B077', cursor: 'pointer',
              background: 'none', border: 'none', padding: 0,
            }}
          >
            {showPw ? 'Hide' : 'Update Password'}
          </button>
        </div>

        {showPw && (
          <form action={pwAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {pwState?.error && (
              <div style={{
                padding: '0.75rem 1rem', borderRadius: 10,
                background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)',
                fontSize: '0.8125rem', color: '#f43f5e',
              }}>
                {pwState.error}
              </div>
            )}
            {pwState?.success && (
              <div style={{
                padding: '0.75rem 1rem', borderRadius: 10,
                background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                fontSize: '0.8125rem', color: '#10b981', fontWeight: 600,
              }}>
                ✓ Password updated successfully!
              </div>
            )}

            {[
              { id: 'currentPassword', label: 'Current Password', auto: 'current-password' },
              { id: 'newPassword', label: 'New Password (min 8 chars)', auto: 'new-password' },
              { id: 'confirmPassword', label: 'Confirm New Password', auto: 'new-password' },
            ].map(f => (
              <div key={f.id}>
                <label htmlFor={f.id} style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
                  {f.label}
                </label>
                <input
                  id={f.id}
                  name={f.id}
                  type="password"
                  autoComplete={f.auto}
                  style={{
                    width: '100%', padding: '0.75rem 1rem', borderRadius: 10,
                    background: 'var(--bg-raised)', border: '1px solid var(--border)',
                    color: 'var(--text-primary)', fontSize: '0.9375rem', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={pwPending}
              style={{
                padding: '0.75rem', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #00B077, #008E60)',
                color: '#fff', fontWeight: 700, cursor: 'pointer',
                opacity: pwPending ? 0.7 : 1, transition: 'opacity 200ms',
              }}
            >
              {pwPending ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}

        {!showPw && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
            Your password is encrypted and stored securely.
          </p>
        )}
      </div>

      {/* ─── Danger Zone ─── */}
      <div style={{ background: 'rgba(244,63,94,0.04)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 16, padding: '1.5rem' }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#f43f5e', margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>logout</span>
          Sign Out
        </h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0 0 1rem' }}>
          You will be signed out from this workspace session.
        </p>
        <form action={logoutAction}>
          <button
            type="submit"
            style={{
              padding: '0.625rem 1.5rem', borderRadius: 10,
              background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)',
              color: '#f43f5e', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem',
            }}
          >
            Sign Out
          </button>
        </form>
      </div>

    </div>
  )
}
