'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { getTenantOverviewStats } from '@/actions/tenant-dashboard'
import { formatCompactNumber, formatCompactCurrency } from '@/lib/format'
import { TENANT_SERVICE_CARDS } from '@/lib/tenant-services'

export default function TenantOverviewClient({
  tenantName,
  industry,
  activeModules,
  services,
}: {
  tenantName: string
  industry: string
  activeModules: string[]
  services: Record<string, boolean>
}) {
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    getTenantOverviewStats().then(setStats)
  }, [])

  const STATS_CONFIG = [
    { key: 'records', label: industry === 'EDUCATION' ? 'Total Students / Staff' : industry === 'REAL_ESTATE' ? 'Total Leads / Properties' : 'Active Records', icon: 'groups', color: '#3b82f6' },
    { key: 'transactions', label: 'Recorded Transactions', icon: 'receipt_long', color: '#10b981' },
    { key: 'revenue', label: 'Local Gross Revenue', icon: 'account_balance_wallet', color: '#10b981', isCurrency: true },
    { key: 'webhooks', label: 'Intercepted Payloads', icon: 'api', color: '#f59e0b' },
  ]

  const visibleServices = TENANT_SERVICE_CARDS.filter(card => {
    const hasParent = card.isModuleKey ? activeModules.includes(card.key) : !card.requiresModule || activeModules.includes(card.requiresModule)
    const enabled = services[card.key] !== false
    return hasParent && enabled
  })

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 0.5rem' }}>
          Workspace Operations
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
          High-level metrics for {tenantName}. Your interface automatically morphs based on the "{industry}" system taxonomy.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {STATS_CONFIG.map(config => (
          <div key={config.key} style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 16, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
             <div style={{ width: 56, height: 56, borderRadius: 14, background: `${config.color}15`, color: config.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.75rem' }}>{config.icon}</span>
             </div>
             <div>
               <p style={{ margin: '0 0 0.25rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                 {config.label}
               </p>
               <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                 {!stats ? '...' : config.isCurrency ? formatCompactCurrency(stats[config.key]) : formatCompactNumber(stats[config.key])}
               </h3>
             </div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 16, border: '1px solid var(--border)', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
              Tenant Workspaces
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>
              Each tenant service stays isolated and can be managed independently from settings.
            </p>
          </div>
          <Link
            href="/dashboard/settings/services"
            style={{
              textDecoration: 'none',
              padding: '0.65rem 0.95rem',
              borderRadius: 10,
              background: 'rgba(0,176,119,0.1)',
              border: '1px solid rgba(0,176,119,0.2)',
              color: '#00B077',
              fontWeight: 800,
              fontSize: '0.8125rem',
            }}
          >
            Manage Services
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.9rem' }}>
          {visibleServices.map(card => (
            <Link
              key={card.key}
              href={card.route || '/dashboard/settings/services'}
              style={{
                textDecoration: 'none',
                background: 'var(--bg-raised)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.55rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.4rem', color: '#00B077' }}>
                  {card.icon}
                </span>
                <span style={{
                  fontSize: '0.6875rem',
                  fontWeight: 800,
                  color: '#00B077',
                  background: 'rgba(0,176,119,0.1)',
                  borderRadius: 999,
                  padding: '0.2rem 0.5rem',
                }}>
                  Active
                </span>
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                {card.label}
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                {card.description}
              </p>
            </Link>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--bg-surface)', padding: '2rem', borderRadius: 16, border: '1px solid var(--border)', textAlign: 'center' }}>
         <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, background: 'rgba(0,176,119,0.1)', color: '#00B077', borderRadius: '50%', marginBottom: '1rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '2rem' }}>rocket_launch</span>
         </div>
         <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.5rem' }}>
            Polymorphic Architecture Ready
         </h2>
         <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: 500, margin: '0 auto' }}>
            Your dashboard is structurally bound to the localized TiDB schema instance. All configurations, records, and logs you generate here are strictly isolated from the rest of the Nixvra network.
         </p>
      </div>
    </div>
  )
}
