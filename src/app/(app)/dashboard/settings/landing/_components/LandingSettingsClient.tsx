'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { updateTenantLandingPageAction, type LandingPageConfig } from '@/actions/tenant-settings'

type FormState = {
  logoUrl: string
  tagline: string
  primaryColor: string
  landingPage: LandingPageConfig
}

export default function LandingSettingsClient({
  tenantName,
  tenantSubdomain,
  initial,
}: {
  tenantName: string
  tenantSubdomain: string
  initial: FormState
}) {
  const [form, setForm] = useState<FormState>(initial)
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }

  function save() {
    setError(null)
    startTransition(async () => {
      const res = await updateTenantLandingPageAction({
        logoUrl: form.logoUrl,
        tagline: form.tagline,
        primaryColor: form.primaryColor,
        landingPage: form.landingPage,
      })
      if (!res.success) {
        setError(res.error ?? 'Failed to update landing settings.')
        return
      }
      showToast('Landing page settings updated.')
    })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: 10,
    background: 'var(--bg-raised)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    outline: 'none',
    fontSize: '0.9375rem',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.8125rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ color: '#00B077', fontSize: '1.4rem' }}>language</span>
            Landing Page Settings
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
            Control branding, hero content, SEO, and custom sections for <b>{tenantName}</b>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <a
            href={`/${tenantSubdomain}`}
            target="_blank"
            rel="noreferrer"
            style={{
              textDecoration: 'none',
              padding: '0.55rem 0.9rem',
              borderRadius: 10,
              border: '1px solid rgba(0,176,119,0.25)',
              background: 'rgba(0,176,119,0.10)',
              color: '#00B077',
              fontWeight: 900,
              fontSize: '0.8125rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.05rem' }}>open_in_new</span>
            Preview
          </a>
          <Link
            href="/dashboard/settings"
            style={{
              textDecoration: 'none',
              padding: '0.55rem 0.9rem',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontWeight: 800,
              fontSize: '0.8125rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.05rem', color: 'var(--text-muted)' }}>arrow_back</span>
            Settings Home
          </Link>
        </div>
      </header>

      {error && (
        <div style={{ padding: '0.875rem 1rem', borderRadius: 12, background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)', color: '#f43f5e', fontWeight: 700, fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: 'var(--text-primary)' }}>Branding</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
          <div>
            <label style={labelStyle}>Logo URL</label>
            <input value={form.logoUrl} onChange={e => setForm(prev => ({ ...prev, logoUrl: e.target.value }))} placeholder="https://..." style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Primary Color</label>
            <input value={form.primaryColor} onChange={e => setForm(prev => ({ ...prev, primaryColor: e.target.value }))} placeholder="#00B077" style={inputStyle} />
          </div>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <label style={labelStyle}>Tagline (Legacy Hero Title)</label>
          <input value={form.tagline} onChange={e => setForm(prev => ({ ...prev, tagline: e.target.value }))} placeholder={`Welcome to ${tenantName}`} style={inputStyle} />
          <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            Used as hero heading fallback if no custom hero title is set.
          </p>
        </div>
      </div>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: 'var(--text-primary)' }}>Hero</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
          <div>
            <label style={labelStyle}>Hero Title</label>
            <input
              value={form.landingPage.heroTitle ?? ''}
              onChange={e => setForm(prev => ({ ...prev, landingPage: { ...prev.landingPage, heroTitle: e.target.value } }))}
              placeholder={form.tagline || `Welcome to ${tenantName}`}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Hero Subtitle</label>
            <input
              value={form.landingPage.heroSubtitle ?? ''}
              onChange={e => setForm(prev => ({ ...prev, landingPage: { ...prev.landingPage, heroSubtitle: e.target.value } }))}
              placeholder="One short line describing what you do."
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: 'var(--text-primary)' }}>SEO</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
          <div>
            <label style={labelStyle}>SEO Title</label>
            <input
              value={form.landingPage.seoTitle ?? ''}
              onChange={e => setForm(prev => ({ ...prev, landingPage: { ...prev.landingPage, seoTitle: e.target.value } }))}
              placeholder={`${tenantName} - Official Site`}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>SEO Description</label>
            <input
              value={form.landingPage.seoDescription ?? ''}
              onChange={e => setForm(prev => ({ ...prev, landingPage: { ...prev.landingPage, seoDescription: e.target.value } }))}
              placeholder="Short, search-friendly summary."
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: 'var(--text-primary)' }}>Custom Content</h2>
        <p style={{ margin: '0.5rem 0 0.75rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Optional text block rendered on the public landing page.
        </p>
        <textarea
          value={form.landingPage.customContent ?? ''}
          onChange={e => setForm(prev => ({ ...prev, landingPage: { ...prev.landingPage, customContent: e.target.value } }))}
          placeholder="Write a short 'About' section or any custom message..."
          rows={5}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: 12,
            border: 'none',
            background: '#00B077',
            color: '#fff',
            fontWeight: 900,
            cursor: isPending ? 'not-allowed' : 'pointer',
            opacity: isPending ? 0.7 : 1,
          }}
        >
          {isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {toast && (
        <div style={{
          position: 'fixed',
          right: 18,
          bottom: 18,
          padding: '0.75rem 1rem',
          borderRadius: 12,
          background: 'rgba(0,176,119,0.95)',
          color: '#fff',
          fontWeight: 800,
          boxShadow: '0 14px 40px rgba(0,0,0,0.22)',
          zIndex: 9999,
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}

