'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createTenantAction } from '@/actions/tenant'

import {
  BuildingIcon, ShieldIcon,
  UsersIcon, CreditCardIcon, MegaphoneIcon, MessageCircleIcon, ZapIcon, CalendarIcon, AnalyticsIcon, StarIcon
} from '@/components/icons'

const INDUSTRIES = [
  { value: 'EDUCATION', label: 'Education' },
  { value: 'HEALTHCARE', label: 'Healthcare' },
  { value: 'REAL_ESTATE', label: 'Real Estate' },
  { value: 'ECOMMERCE', label: 'E-Commerce' },
  { value: 'SERVICES', label: 'Services / Agency' },
  { value: 'OTHER', label: 'Other' },
]

const ALL_MODULES = [
  { key: 'CRM', label: 'CRM', icon: UsersIcon, desc: 'Customer relationship management' },
  { key: 'BILLING', label: 'Billing', icon: CreditCardIcon, desc: 'Invoices & payments' },
  { key: 'ADS', label: 'Ad Campaigns', icon: MegaphoneIcon, desc: 'Meta & Google ads' },
  { key: 'SOCIAL', label: 'Social Posts', icon: MessageCircleIcon, desc: 'Schedule social content' },
  { key: 'WEBHOOKS', label: 'Webhooks', icon: ZapIcon, desc: 'Event processing' },
  { key: 'SCHEDULING', label: 'Scheduling', icon: CalendarIcon, desc: 'Appointments & slots' },
  { key: 'ANALYTICS', label: 'Analytics', icon: AnalyticsIcon, desc: 'Reports & insights' },
  { key: 'AUDIT', label: 'Audit Log', icon: ShieldIcon, desc: 'Activity tracking' },
]

export default function NewTenantPage() {
  const [isPending, startTransition] = useTransition()
  const [subdomain, setSubdomain] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [selectedModules, setSelectedModules] = useState<string[]>(['CRM', 'BILLING'])

  function handleNameChange(v: string) {
    setName(v)
    setSubdomain(v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 30))
  }

  function toggleModule(key: string) {
    setSelectedModules(prev =>
      prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key]
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)
    selectedModules.forEach(m => formData.set(`module_${m}`, 'on'))

    startTransition(async () => {
      try {
        await createTenantAction(formData)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to create tenant')
      }
    })
  }

  return (
    <>
      <header className="os-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/super-admin/tenants" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--bg-raised)', border: '1px solid var(--border)',
            color: 'var(--text-muted)', textDecoration: 'none', fontSize: '1rem',
          }}>←</Link>
          <div>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Create New Tenant</h1>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>Provisions a new isolated TiDB database</p>
          </div>
        </div>
      </header>

      <div className="os-content">
        {isPending && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: 16, padding: '2.5rem 3rem', textAlign: 'center', maxWidth: 400,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', margin: '0 auto 1.25rem',
                border: '3px solid rgba(0,176,119,0.3)', borderTopColor: '#00B077',
                animation: 'spin 0.8s linear infinite',
              }} />
              <h3 style={{ color: 'var(--text-primary)', margin: '0 0 0.5rem', fontWeight: 700 }}>Provisioning Tenant</h3>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
                Creating isolated TiDB database and pushing schema...
                <br /><small>This may take 15–30 seconds</small>
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ maxWidth: 800, margin: '0 auto' }}>
          {error && (
            <div style={{
              padding: '0.875rem 1rem', borderRadius: 10, marginBottom: '1.5rem',
              background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)',
              color: '#fca5a5', fontSize: '0.9rem',
            }}>⚠️ {error}</div>
          )}

          {/* Basic Info */}
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '1.75rem', marginBottom: '1.25rem',
          }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
              🏢 Tenant Information
            </h2>
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
                  Company / Tenant Name *
                </label>
                <input
                  name="name" required
                  value={name} onChange={e => handleNameChange(e.target.value)}
                  placeholder="e.g. Sunrise Academy"
                  style={{
                    width: '100%', padding: '0.75rem 1rem', borderRadius: 10,
                    background: 'var(--bg-raised)', border: '1px solid var(--border)',
                    color: 'var(--text-primary)', fontSize: '0.9375rem', outline: 'none',
                  }}
                />
              </div>
              <div className="col-12 col-md-6">
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
                  Subdomain *
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  <input
                    name="subdomain" required
                    value={subdomain} onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="sunrise-academy"
                    style={{
                      flex: 1, padding: '0.75rem 1rem', borderRadius: '10px 0 0 10px',
                      background: 'var(--bg-raised)', border: '1px solid var(--border)',
                      borderRight: 'none', color: 'var(--text-primary)', fontSize: '0.9375rem', outline: 'none',
                    }}
                  />
                  <span style={{
                    padding: '0.75rem 0.875rem', borderRadius: '0 10px 10px 0',
                    background: 'var(--bg-overlay)', border: '1px solid var(--border)',
                    color: 'var(--text-muted)', fontSize: '0.8125rem', whiteSpace: 'nowrap',
                  }}>.nixvra.online</span>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
                  Industry *
                </label>
                <select name="industry" required style={{
                  width: '100%', padding: '0.75rem 1rem', borderRadius: 10,
                  background: 'var(--bg-raised)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', fontSize: '0.9375rem', outline: 'none', cursor: 'pointer',
                }}>
                  <option value="">Select industry...</option>
                  {INDUSTRIES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Admin Account */}
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '1.75rem', marginBottom: '1.25rem',
          }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
              👤 Tenant Admin Account
            </h2>
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>Admin Email *</label>
                <input
                  name="adminEmail" type="email" required placeholder="admin@company.com"
                  style={{
                    width: '100%', padding: '0.75rem 1rem', borderRadius: 10,
                    background: 'var(--bg-raised)', border: '1px solid var(--border)',
                    color: 'var(--text-primary)', fontSize: '0.9375rem', outline: 'none',
                  }}
                />
              </div>
              <div className="col-12 col-md-6">
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>Admin Password *</label>
                <input
                  name="adminPassword" type="password" required placeholder="Min. 8 characters"
                  style={{
                    width: '100%', padding: '0.75rem 1rem', borderRadius: 10,
                    background: 'var(--bg-raised)', border: '1px solid var(--border)',
                    color: 'var(--text-primary)', fontSize: '0.9375rem', outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Modules */}
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '1.75rem', marginBottom: '1.75rem',
          }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>🔌 Modules</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Select which features this tenant can access
            </p>
            <div className="row g-3">
              {ALL_MODULES.map(m => {
                const active = selectedModules.includes(m.key)
                return (
                  <div key={m.key} className="col-6 col-md-3">
                    <button
                      type="button" onClick={() => toggleModule(m.key)}
                      style={{
                        width: '100%', padding: 0, borderRadius: 12, cursor: 'pointer',
                        background: active ? 'rgba(0,176,119,0.12)' : 'var(--bg-raised)',
                        border: `1px solid ${active ? 'rgba(0,176,119,0.4)' : 'var(--border)'}`,
                        textAlign: 'left', transition: 'all 200ms', overflow: 'hidden'
                      }}
                    >
                      <div style={{ padding: '1rem', background: active ? 'rgba(0,176,119,0.08)' : 'transparent', display: 'flex', gap: '0.75rem' }}>
                        <div style={{ flexShrink: 0, marginTop: '0.2rem', color: active ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          <m.icon style={{ width: 18, height: 18 }} />
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.125rem', color: active ? 'var(--text-primary)' : 'var(--text-primary)' }}>{m.label}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.desc}</p>
                        </div>
                      </div>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Subscription Plan */}
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '1.75rem', marginBottom: '1.25rem',
          }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              💎 Subscription Plan
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Set the plan tier, billing amount, and expiry date
            </p>

            {/* Plan Selector */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              {[
                { value: 'TRIAL', label: 'Trial', icon: CalendarIcon, color: '#f59e0b', desc: '14-day limit' },
                { value: 'BASIC', label: 'Basic', icon: ShieldIcon, color: '#06b6d4', desc: 'Core features' },
                { value: 'PRO', label: 'Pro', icon: StarIcon, color: '#008E60', desc: 'Full access' },
                { value: 'ENTERPRISE', label: 'Enterprise', icon: BuildingIcon, color: '#00B077', desc: 'Custom limits' },
              ].map((p) => (
                <label key={p.value} style={{ cursor: 'pointer' }}>
                  <input type="radio" name="plan" value={p.value} defaultChecked={p.value === 'TRIAL'} style={{ display: 'none' }} />
                  <div className="plan-option" data-plan={p.value} style={{
                    padding: '1rem', borderRadius: 12,
                    background: 'var(--bg-raised)', border: `1px solid ${p.color}33`,
                    textAlign: 'center', transition: 'all 200ms',
                  }}>
                    <p style={{ color: p.color, marginBottom: '0.375rem' }}><p.icon style={{ width: 24, height: 24 }} /></p>
                    <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)', margin: 0 }}>{p.label}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>{p.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="row g-3">
              <div className="col-12 col-md-4">
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
                  Plan Amount (₹)
                </label>
                <input name="planAmount" type="number" min="0" step="0.01" defaultValue="0" placeholder="0"
                  style={{
                    width: '100%', padding: '0.75rem 1rem', borderRadius: 10,
                    background: 'var(--bg-raised)', border: '1px solid var(--border)',
                    color: 'var(--text-primary)', fontSize: '0.9375rem', outline: 'none',
                  }}
                />
              </div>
              <div className="col-12 col-md-4">
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
                  Billing Cycle
                </label>
                <select name="billingCycle" style={{
                  width: '100%', padding: '0.75rem 1rem', borderRadius: 10,
                  background: 'var(--bg-raised)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', fontSize: '0.9375rem', outline: 'none', cursor: 'pointer',
                }}>
                  <option value="MONTHLY">📅 Monthly</option>
                  <option value="QUARTERLY">📆 Quarterly</option>
                  <option value="YEARLY">🗓️ Yearly</option>
                </select>
              </div>
              <div className="col-12 col-md-4">
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
                  Plan Expiry Date
                </label>
                <input name="planExpiry" type="date" style={{
                  width: '100%', padding: '0.75rem 1rem', borderRadius: 10,
                  background: 'var(--bg-raised)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', fontSize: '0.9375rem', outline: 'none', colorScheme: 'dark',
                }} />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Link href="/super-admin/tenants" className="btn btn-secondary">Cancel</Link>
            <button type="submit" disabled={isPending} className="btn btn-primary" style={{ minWidth: 200 }}>
              {isPending ? 'Provisioning...' : 'Create Tenant & Provision DB'}
            </button>
          </div>
        </form>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
