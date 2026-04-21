'use client'

import { useState, useTransition, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { updateTenantAction } from '@/actions/tenant'

import {
  UsersIcon, CreditCardIcon, MegaphoneIcon, MessageCircleIcon, ZapIcon, CalendarIcon, AnalyticsIcon, ShieldIcon, ActivityIcon, CheckIcon, CrossIcon, AlertIcon, StarIcon, ClockIcon, BuildingIcon
} from '@/components/icons'

const INDUSTRIES = [
  { value: 'EDUCATION', label: 'Education' },
  { value: 'HEALTHCARE', label: 'Healthcare' },
  { value: 'REAL_ESTATE', label: 'Real Estate' },
  { value: 'ECOMMERCE', label: 'E-Commerce' },
  { value: 'SERVICES', label: 'Services / Agency' },
  { value: 'OTHER', label: 'Other' },
]

const ALL_MODULES = ['CRM', 'BILLING', 'ADS', 'SOCIAL', 'WEBHOOKS', 'SCHEDULING', 'ANALYTICS', 'AUDIT']
const MODULE_ICONS: Record<string, any> = {
  CRM: UsersIcon, BILLING: CreditCardIcon, ADS: MegaphoneIcon, SOCIAL: MessageCircleIcon,
  WEBHOOKS: ZapIcon, SCHEDULING: CalendarIcon, ANALYTICS: AnalyticsIcon, AUDIT: ShieldIcon,
}

interface EditTenantModalProps {
  tenant: {
    id: string
    name: string
    industry: string
    modules: unknown
    plan: string
    planStatus: string
    planAmount: number
    billingCycle: string
    planExpiryDate: string | null
  }
  isOpen: boolean
  onClose: () => void
}

export default function EditTenantModal({ tenant, isOpen, onClose }: EditTenantModalProps) {
  const [isPending, startTransition] = useTransition()
  const [modules, setModules] = useState<string[]>(() =>
    Array.isArray(tenant.modules) ? tenant.modules as string[] : []
  )
  const [mounted, setMounted] = useState(false)

  // Reset on open
  useEffect(() => {
    setMounted(true)
    if (isOpen) {
      setModules(Array.isArray(tenant.modules) ? tenant.modules as string[] : [])
    }
  }, [isOpen, tenant.modules])

  if (!isOpen) return null

  function toggle(m: string) {
    setModules(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    modules.forEach(m => fd.set(`module_${m}`, 'on'))

    startTransition(async () => {
      await updateTenantAction(tenant.id, fd)
      onClose()
    })
  }

  if (!mounted) return null

  return createPortal(
    <>
      {/* Scrollable Overlay Backdrop */}
      <div
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: '3rem 1rem', overflowY: 'auto',
        }}
      >
        {/* Modal */}
        <div style={{
          position: 'relative', margin: 'auto',
          width: '100%', maxWidth: 560,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 20, padding: '2rem',
          boxShadow: '0 25px 80px rgba(0,0,0,0.7)',
        }}>
          {/* Close Button Top Pinned */}
          <button onClick={onClose} style={{
            position: 'absolute', top: '1.25rem', right: '1.25rem',
            width: 32, height: 32, borderRadius: 8, background: 'var(--bg-raised)',
            border: '1px solid var(--border)', color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: '1.125rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10,
          }}>✕</button>

          <div style={{ marginBottom: '1.5rem', paddingRight: '2.5rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Edit Tenant
            </h2>
          </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
              Tenant Name
            </label>
            <input name="name" defaultValue={tenant.name} required style={{
              width: '100%', padding: '0.75rem 1rem', borderRadius: 10,
              background: 'var(--bg-raised)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', fontSize: '0.9375rem', outline: 'none',
            }} />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
              Industry
            </label>
            <select name="industry" defaultValue={tenant.industry} style={{
              width: '100%', padding: '0.75rem 1rem', borderRadius: 10,
              background: 'var(--bg-raised)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', fontSize: '0.9375rem', outline: 'none', cursor: 'pointer',
            }}>
              {INDUSTRIES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.625rem' }}>
              Active Modules
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              {ALL_MODULES.map(m => {
                const active = modules.includes(m)
                const IconComp = MODULE_ICONS[m]
                return (
                  <button key={m} type="button" onClick={() => toggle(m)} style={{
                    padding: '0.625rem 0.5rem', borderRadius: 10, cursor: 'pointer',
                    background: active ? 'rgba(0,176,119,0.15)' : 'var(--bg-raised)',
                    border: `1px solid ${active ? 'rgba(0,176,119,0.4)' : 'var(--border)'}`,
                    color: active ? '#818cf8' : 'var(--text-muted)',
                    fontSize: '0.75rem', fontWeight: 600, textAlign: 'center',
                    transition: 'all 200ms', display: 'flex', flexDirection: 'column', alignItems: 'center'
                  }}>
                    <span style={{ display: 'block', marginBottom: '0.25rem' }}>
                      {IconComp ? <IconComp style={{ width: 18, height: 18 }} /> : null}
                    </span>
                    {m}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Subscription */}
          <div style={{
            padding: '1rem', borderRadius: 12, marginBottom: '1.25rem',
            background: 'var(--bg-raised)', border: '1px solid var(--border)',
          }}>
            <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.875rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-outlined">diamond</span> Subscription
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '0.625rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Plan</label>
                <select name="plan" defaultValue={tenant.plan} style={{
                  width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8,
                  background: 'var(--bg-overlay)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none',
                }}>
                  {[['TRIAL','Trial'],['BASIC','Basic'],['PRO','Pro'],['ENTERPRISE','Enterprise']].map(([v,l]) =>
                    <option key={v} value={v}>{l}</option>
                  )}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Status</label>
                <select name="planStatus" defaultValue={tenant.planStatus} style={{
                  width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8,
                  background: 'var(--bg-overlay)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none',
                }}>
                  {[['ACTIVE','Active'],['TRIAL','Trial'],['EXPIRED','Expired'],['CANCELLED','Cancelled'],['SUSPENDED','Suspended']].map(([v,l]) =>
                    <option key={v} value={v}>{l}</option>
                  )}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Amount (₹)</label>
                <input name="planAmount" type="number" min="0" step="0.01" defaultValue={tenant.planAmount} style={{
                  width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8,
                  background: 'var(--bg-overlay)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none',
                }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Billing Cycle</label>
                <select name="billingCycle" defaultValue={tenant.billingCycle} style={{
                  width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8,
                  background: 'var(--bg-overlay)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none',
                }}>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Expiry Date</label>
              <input name="planExpiry" type="date"
                defaultValue={tenant.planExpiryDate ? new Date(tenant.planExpiryDate).toISOString().split('T')[0] : ''}
                style={{
                  width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8,
                  background: 'var(--bg-overlay)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none', colorScheme: 'dark',
                }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{
              padding: '0.625rem 1.25rem', borderRadius: 10,
              background: 'var(--bg-raised)', border: '1px solid var(--border)',
              color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
            }}>Cancel</button>
            <button type="submit" disabled={isPending} style={{
              padding: '0.625rem 1.5rem', borderRadius: 10,
              background: 'linear-gradient(135deg, #00B077, #008E60)',
              border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem',
              opacity: isPending ? 0.7 : 1,
            }}>
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>,
    document.body
  )
}
