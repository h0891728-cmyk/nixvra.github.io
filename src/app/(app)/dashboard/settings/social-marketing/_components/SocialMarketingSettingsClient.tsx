'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import GoogleConnectPanel from '../../_components/GoogleConnectPanel'
import { setTenantServiceEnabledAction, type TenantServicesConfig } from '@/actions/tenant-settings'
import { SOCIAL_AUTOMATION_CARDS } from '@/lib/tenant-services'

type GoogleStatus = {
  isConnected: boolean
  email?: string
  googleAccountId?: string
  loginEnabled?: boolean
  connectedAt?: string
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export default function SocialMarketingSettingsClient({
  tenantId,
  isAdmin,
  google,
  entitledModules,
  services,
}: {
  tenantId: string
  isAdmin: boolean
  google: GoogleStatus
  entitledModules: string[]
  services: TenantServicesConfig | null
}) {
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const entitledSet = useMemo(() => new Set(entitledModules), [entitledModules])
  const initial = useMemo(() => (isPlainObject(services) ? { ...services } : {}), [services])
  const [local, setLocal] = useState<TenantServicesConfig>(initial)

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 2400)
  }

  function hasParent(cardKey: string, requiresModule?: string) {
    if (!requiresModule) return true
    return entitledSet.has(requiresModule)
  }

  function isEnabled(cardKey: string) {
    return local[cardKey] !== false
  }

  function toggle(cardKey: string, label: string, nextEnabled: boolean) {
    setError(null)
    setLocal(prev => ({ ...prev, [cardKey]: nextEnabled }))

    startTransition(async () => {
      const res = await setTenantServiceEnabledAction(cardKey, nextEnabled)
      if (!res.success) {
        setLocal(prev => ({ ...prev, [cardKey]: !nextEnabled }))
        setError(res.error ?? 'Failed to update automation.')
        return
      }
      showToast(nextEnabled ? `${label} enabled.` : `${label} disabled.`)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.9rem' }}>
        {[
          { href: '/dashboard/marketing', icon: 'campaign', title: 'Open Marketing Hub', desc: 'Posts, campaigns, and historical channel sync.' },
          { href: '/dashboard/chat', icon: 'chat', title: 'Open Chat Module', desc: 'Direct chat, broadcasts, and message history.' },
          { href: '/dashboard/settings/services', icon: 'tune', title: 'Service Controls', desc: 'Enable or disable communications modules.' },
        ].map(card => (
          <Link
            key={card.href}
            href={card.href}
            style={{
              textDecoration: 'none',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: '1rem',
              display: 'flex',
              gap: '0.8rem',
              alignItems: 'flex-start',
            }}
          >
            <span className="material-symbols-outlined" style={{ color: '#00B077', fontSize: '1.35rem' }}>
              {card.icon}
            </span>
            <div>
              <p style={{ margin: 0, fontWeight: 900, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>{card.title}</p>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{card.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <GoogleConnectPanel status={google} tenantId={tenantId} isAdmin={isAdmin} />

      {error && (
        <div style={{ padding: '0.875rem 1rem', borderRadius: 12, background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)', color: '#f43f5e', fontWeight: 700, fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: 'var(--text-primary)' }}>Social Automations</h2>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Control how your tenant shares data between social channels, lead flows, and CRM records.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.9rem' }}>
          {SOCIAL_AUTOMATION_CARDS.map(card => {
            const available = hasParent(card.key, card.requiresModule)
            const enabled = available && isEnabled(card.key)

            return (
              <div
                key={card.key}
                style={{
                  background: 'var(--bg-raised)',
                  border: '1px solid var(--border)',
                  borderRadius: 14,
                  padding: '1rem',
                  opacity: available ? 1 : 0.55,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {card.key}
                    </p>
                    <h3 style={{ margin: '0.25rem 0 0', fontSize: '0.95rem', fontWeight: 900, color: 'var(--text-primary)' }}>{card.label}</h3>
                  </div>

                  <button
                    type="button"
                    disabled={!available || isPending}
                    aria-checked={enabled}
                    role="switch"
                    onClick={() => toggle(card.key, card.label, !enabled)}
                    style={{
                      position: 'relative',
                      width: 52,
                      height: 30,
                      borderRadius: 999,
                      border: 'none',
                      cursor: !available || isPending ? 'not-allowed' : 'pointer',
                      background: enabled ? '#00B077' : 'var(--border)',
                      padding: 0,
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: 3,
                        left: enabled ? 25 : 3,
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: '#fff',
                        boxShadow: '0 1px 6px rgba(0,0,0,0.22)',
                        transition: 'left 250ms',
                      }}
                    />
                  </button>
                </div>

                <p style={{ margin: '0.65rem 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {card.description}
                </p>

                {!available && (
                  <p style={{ margin: '0.75rem 0 0', fontSize: '0.75rem', fontWeight: 800, color: '#f59e0b' }}>
                    Locked until the parent workspace module is active.
                  </p>
                )}
              </div>
            )
          })}
        </div>
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
