'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { setTenantServiceEnabledAction, type TenantServicesConfig } from '@/actions/tenant-settings'
import { TENANT_SERVICE_CARDS, type TenantServiceCard } from '@/lib/tenant-services'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export default function ServicesSettingsClient({
  tenantName,
  entitledModules,
  services,
}: {
  tenantName: string
  entitledModules: string[]
  services: TenantServicesConfig | null
}) {
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const entitledSet = useMemo(() => new Set(entitledModules), [entitledModules])

  const initial: TenantServicesConfig = useMemo(() => {
    const base: TenantServicesConfig = {}
    if (isPlainObject(services)) Object.assign(base, services)
    return base
  }, [services])

  const [local, setLocal] = useState<TenantServicesConfig>(initial)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }

  function isEntitled(card: TenantServiceCard) {
    if (card.isModuleKey) return entitledSet.has(card.key)
    if (card.requiresModule) return entitledSet.has(card.requiresModule)
    return true
  }

  function isEnabled(card: TenantServiceCard) {
    if (!isEntitled(card)) return false
    return local[card.key] !== false
  }

  function setEnabled(card: TenantServiceCard, nextEnabled: boolean) {
    setError(null)

    // Optimistic update for UI.
    setLocal(prev => ({ ...prev, [card.key]: nextEnabled }))

    startTransition(async () => {
      const res = await setTenantServiceEnabledAction(card.key, nextEnabled)
      if (!res.success) {
        // Roll back if server rejects.
        setLocal(prev => ({ ...prev, [card.key]: !nextEnabled }))
        setError(res.error ?? 'Failed to update service settings.')
        return
      }
      showToast(nextEnabled ? `${card.label} enabled.` : `${card.label} disabled.`)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <header>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ color: '#00B077', fontSize: '1.4rem' }}>tune</span>
              Services Management
            </h1>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
              Turn services on/off for <b>{tenantName}</b>. Entitlements are controlled by Super Admin modules.
            </p>
          </div>
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
              flexShrink: 0,
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
        {TENANT_SERVICE_CARDS.map(card => {
          const entitled = isEntitled(card)
          const enabled = isEnabled(card)

          return (
            <div
              key={card.key}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '1.25rem',
                opacity: entitled ? 1 : 0.6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {card.key}
                  </p>
                  <h2 style={{ margin: '0.25rem 0 0.35rem', fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                    {card.label}
                  </h2>
                </div>

                <button
                  type="button"
                  disabled={!entitled || isPending}
                  aria-checked={enabled}
                  role="switch"
                  onClick={() => setEnabled(card, !enabled)}
                  style={{
                    position: 'relative',
                    width: 52,
                    height: 30,
                    borderRadius: 999,
                    border: 'none',
                    cursor: !entitled || isPending ? 'not-allowed' : 'pointer',
                    background: enabled ? '#00B077' : 'var(--border)',
                    transition: 'background 250ms',
                    flexShrink: 0,
                    padding: 0,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 3,
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: '#fff',
                      boxShadow: '0 1px 6px rgba(0,0,0,0.22)',
                      transition: 'left 250ms',
                      left: enabled ? '25px' : '3px',
                    }}
                  />
                </button>
              </div>

              <p style={{ margin: '0.75rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {card.description}
              </p>

              {!entitled && (
                <p style={{ margin: '0.75rem 0 0', fontSize: '0.75rem', fontWeight: 800, color: '#f59e0b' }}>
                  Locked (not enabled for this workspace)
                </p>
              )}

              {card.route && entitled && enabled && (
                <Link
                  href={card.route}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: '0.9rem',
                    color: '#00B077',
                    textDecoration: 'none',
                    fontSize: '0.8125rem',
                    fontWeight: 800,
                  }}
                >
                  Open workspace
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>arrow_forward</span>
                </Link>
              )}
            </div>
          )
        })}
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
