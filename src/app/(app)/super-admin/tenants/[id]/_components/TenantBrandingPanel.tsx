'use client'

import { useState } from 'react'
import { updateTenantBranding } from '@/actions/public-ingestion'

type Props = {
  tenantId: string
  subdomain: string
  industry: string
  initialLogoUrl: string | null
  initialTagline: string | null
  initialPrimaryColor: string
}

const INDUSTRY_DEFAULTS: Record<string, { color: string; tagline: string }> = {
  EDUCATION: { color: '#00B077', tagline: 'Shape your future with us.' },
  HEALTHCARE: { color: '#10b981', tagline: 'Expert care, compassionate hearts.' },
  REAL_ESTATE: { color: '#f59e0b', tagline: 'Find your perfect home.' },
  ECOMMERCE: { color: '#06b6d4', tagline: 'Shop smarter, live better.' },
  SERVICES: { color: '#008E60', tagline: 'Professional services, trusted by thousands.' },
  OTHER: { color: '#00B077', tagline: 'Welcome to our platform.' },
}

export default function TenantBrandingPanel({
  tenantId,
  subdomain,
  industry,
  initialLogoUrl,
  initialTagline,
  initialPrimaryColor,
}: Props) {
  const defaults = INDUSTRY_DEFAULTS[industry] ?? INDUSTRY_DEFAULTS.OTHER
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl ?? '')
  const [tagline, setTagline] = useState(initialTagline ?? defaults.tagline)
  const [primaryColor, setPrimaryColor] = useState(initialPrimaryColor ?? defaults.color)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      await updateTenantBranding(tenantId, {
        logoUrl: logoUrl || undefined,
        tagline: tagline || undefined,
        primaryColor,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save branding.')
    }
    setSaving(false)
  }

  const publicUrl = `http://${subdomain}.localhost:3000`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header Banner */}
      <div style={{
        padding: '1.5rem',
        borderRadius: 16,
        background: 'linear-gradient(135deg, rgba(0,176,119,0.1) 0%, rgba(0,142,96,0.08) 100%)',
        border: '1px solid rgba(0,176,119,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ color: '#00B077' }}>web</span>
            Public Landing Page — {industry}
          </h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Customize the public-facing website for <strong style={{ color: 'var(--text-secondary)' }}>{subdomain}.nixvra.online</strong>
          </p>
        </div>
        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '0.5rem 1rem', borderRadius: 10,
            background: 'rgba(0,176,119,0.12)', border: '1px solid rgba(0,176,119,0.3)',
            color: '#00B077', fontWeight: 700, fontSize: '0.8125rem', textDecoration: 'none',
            transition: 'all 200ms',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>open_in_new</span>
          Preview Live Page
        </a>
      </div>

      {/* Branding Inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>

        {/* Logo & Tagline */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ color: '#f59e0b', fontSize: '1.1rem' }}>image</span>
            Brand Identity
          </h3>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.375rem', textTransform: 'uppercase' }}>
              Logo URL
            </label>
            <input
              type="url"
              value={logoUrl}
              onChange={e => setLogoUrl(e.target.value)}
              placeholder="https://cdn.example.com/logo.png"
              className="form-input"
            />
            {logoUrl && (
              <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg-raised)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  style={{ height: 40, objectFit: 'contain', borderRadius: 6 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Logo Preview</span>
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.375rem', textTransform: 'uppercase' }}>
              Hero Tagline
            </label>
            <input
              type="text"
              value={tagline}
              onChange={e => setTagline(e.target.value)}
              placeholder={defaults.tagline}
              className="form-input"
              maxLength={200}
            />
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {tagline.length}/200 characters — Shown as the hero headline on the landing page
            </p>
          </div>
        </div>

        {/* Color Palette */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ color: '#10b981', fontSize: '1.1rem' }}>palette</span>
            Color Palette
          </h3>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.375rem', textTransform: 'uppercase' }}>
              Primary Brand Color
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <input
                type="color"
                value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
                style={{
                  width: 52, height: 52, borderRadius: 10, border: '2px solid var(--border)',
                  cursor: 'pointer', padding: 2, background: 'var(--bg-raised)',
                }}
              />
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  placeholder="#00B077"
                  className="form-input"
                  pattern="^#([A-Fa-f0-9]{6})$"
                />
              </div>
            </div>
          </div>

          {/* Preset Palette */}
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.625rem' }}>
              Quick Presets
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {[
                { color: '#00B077', name: 'Indigo' },
                { color: '#10b981', name: 'Emerald' },
                { color: '#f59e0b', name: 'Amber' },
                { color: '#06b6d4', name: 'Cyan' },
                { color: '#008E60', name: 'Violet' },
                { color: '#f43f5e', name: 'Rose' },
                { color: '#0ea5e9', name: 'Sky' },
                { color: '#ec4899', name: 'Pink' },
              ].map(p => (
                <button
                  key={p.color}
                  title={p.name}
                  onClick={() => setPrimaryColor(p.color)}
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: p.color,
                    border: primaryColor === p.color ? '3px solid var(--text-primary)' : '3px solid transparent',
                    cursor: 'pointer',
                    transition: 'transform 150ms',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Color Preview */}
          <div style={{
            padding: '1rem',
            borderRadius: 12,
            background: `${primaryColor}12`,
            border: `1.5px solid ${primaryColor}35`,
          }}>
            <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: primaryColor }}>
              Preview: This is how your accent color will look
            </p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Used for buttons, highlights, nav hover states, and cards
            </p>
          </div>
        </div>
      </div>

      {/* Live Preview Box */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="material-symbols-outlined" style={{ color: '#008E60', fontSize: '1.1rem' }}>preview</span>
          Landing Page Preview
        </h3>
        {/* Simulated nav bar */}
        <div style={{
          background: 'rgba(10,10,15,0.95)',
          borderRadius: '12px 12px 0 0',
          padding: '0.75rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          {logoUrl ? (
            <img src={logoUrl} alt="" style={{ height: 28, borderRadius: 6, objectFit: 'contain' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <div style={{ width: 28, height: 28, borderRadius: 6, background: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: '0.875rem' }}>
              {subdomain[0]?.toUpperCase()}
            </div>
          )}
          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#f0f0f8' }}>{subdomain}</span>
        </div>
        {/* Simulated hero */}
        <div style={{
          padding: '2.5rem 1.5rem',
          background: `linear-gradient(135deg, rgba(10,10,15,1) 0%, ${primaryColor}18 100%)`,
          textAlign: 'center',
          borderRadius: '0 0 12px 12px',
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '0.25rem 0.75rem', borderRadius: 20,
            background: `${primaryColor}18`, border: `1px solid ${primaryColor}40`,
            marginBottom: '1rem', fontSize: '0.75rem', fontWeight: 700, color: primaryColor,
          }}>
            {industry}
          </div>
          <p style={{
            fontSize: 'clamp(1.1rem, 3vw, 1.5rem)', fontWeight: 900, color: '#f0f0f8',
            lineHeight: 1.2, maxWidth: 480, margin: '0 auto',
          }}>
            {tagline || defaults.tagline}
          </p>
          <div style={{ marginTop: '1.25rem' }}>
            <span style={{
              display: 'inline-block',
              padding: '0.5rem 1.25rem', borderRadius: 8,
              background: primaryColor, color: '#fff', fontWeight: 700, fontSize: '0.875rem',
            }}>
              Get Started →
            </span>
          </div>
        </div>
      </div>

      {/* Save Actions */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
        padding: '1.25rem 1.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16,
      }}>
        <div>
          {error && (
            <p style={{ margin: 0, fontSize: '0.8125rem', color: '#f43f5e', fontWeight: 600 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: 4 }}>error</span>
              {error}
            </p>
          )}
          {saved && (
            <p style={{ margin: 0, fontSize: '0.8125rem', color: '#10b981', fontWeight: 700 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: 4 }}>check_circle</span>
              Branding saved! Landing page is updated.
            </p>
          )}
          {!error && !saved && (
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Changes will be live at <code style={{ fontSize: '0.75rem', background: 'var(--bg-raised)', padding: '2px 6px', borderRadius: 4 }}>{subdomain}.nixvra.online</code>
            </p>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.625rem 1.25rem', borderRadius: 10 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>
            {saving ? 'autorenew' : 'save'}
          </span>
          {saving ? 'Saving...' : 'Save Branding'}
        </button>
      </div>
    </div>
  )
}
