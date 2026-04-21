'use client'

import React, { useState } from 'react'
import { capturePublicLead } from '@/actions/public-ingestion'
import type { LeadPayload } from '@/actions/public-ingestion'

type Props = {
  subdomain: string
  cta?: string
  entityTypes?: string[] // e.g. "Doctor", "Specialist"
}

export default function LeadCaptureForm({ subdomain, cta = 'Get in Touch', entityTypes = [] }: Props) {
  const [form, setForm] = useState<{ name: string; contact: string; description: string; coreTrait: string }>({
    name: '',
    contact: '',
    description: '',
    coreTrait: entityTypes[0] ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    const payload: LeadPayload = {
      name: form.name,
      contact: form.contact,
      description: form.description || undefined,
      coreTrait: form.coreTrait || undefined,
    }
    const res = await capturePublicLead(subdomain, payload)
    setResult(res)
    if (res.success) setForm({ name: '', contact: '', description: '', coreTrait: entityTypes[0] ?? '' })
    setLoading(false)
  }

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1.5px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '2rem',
    }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
        {cta}
      </h3>

      {result ? (
        <div style={{
          padding: '1.25rem',
          borderRadius: 12,
          background: result.success ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)',
          border: `1px solid ${result.success ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}`,
          textAlign: 'center',
        }}>
          <span className="material-symbols-outlined" style={{
            fontSize: '2rem',
            color: result.success ? '#10b981' : '#f43f5e',
            display: 'block',
            marginBottom: '0.5rem',
          }}>
            {result.success ? 'check_circle' : 'error'}
          </span>
          <p style={{ color: result.success ? '#10b981' : '#f43f5e', fontWeight: 600 }}>{result.message}</p>
          {result.success && (
            <button onClick={() => setResult(null)} style={{
              marginTop: '1rem',
              padding: '0.4rem 1rem',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.8125rem',
            }}>
              Submit Another
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {entityTypes.length > 1 && (
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4, fontWeight: 600 }}>
                Interested In
              </label>
              <select
                value={form.coreTrait}
                onChange={e => setForm(f => ({ ...f, coreTrait: e.target.value }))}
                className="form-input"
              >
                {entityTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4, fontWeight: 600 }}>
              Your Name *
            </label>
            <input
              required
              type="text"
              placeholder="Full Name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="form-input"
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4, fontWeight: 600 }}>
              Email or Phone *
            </label>
            <input
              required
              type="text"
              placeholder="email@example.com or +91 9876543210"
              value={form.contact}
              onChange={e => setForm(f => ({ ...f, contact: e.target.value }))}
              className="form-input"
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4, fontWeight: 600 }}>
              Message (optional)
            </label>
            <textarea
              rows={3}
              placeholder="Tell us more about your inquiry..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="form-input"
              style={{ resize: 'none' }}
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%' }}>
            {loading ? 'Sending...' : 'Send Inquiry →'}
          </button>
        </form>
      )}
    </div>
  )
}
