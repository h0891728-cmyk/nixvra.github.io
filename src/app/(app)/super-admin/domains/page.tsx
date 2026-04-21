import { masterDb } from '@/lib/db'
import Link from 'next/link'
import type { Metadata } from 'next'
import DomainActionsClient from './_components/DomainActionsClient'
import DomainPageHeader from './_components/DomainPageHeader'

export const metadata: Metadata = {
  title: 'Domain Management — Nixvra',
  description: 'Manage custom domains across all tenants. Purchase via Name.com or connect external domains.',
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  ALL:              { color: '#00B077', bg: 'rgba(0,176,119,0.1)',   label: 'All Domains' },
  PENDING_APPROVAL: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Pending Approval' },
  ACTIVE:           { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Active' },
  FAILED:           { color: '#f43f5e', bg: 'rgba(244,63,94,0.12)',  label: 'DNS Failed' },
  REJECTED:         { color: '#5a5a78', bg: 'rgba(90,90,120,0.12)',  label: 'Rejected' },
  NAMECOM:          { color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',  label: 'Name.com' },
}

const TABS = ['ALL', 'PENDING_APPROVAL', 'ACTIVE', 'FAILED', 'REJECTED', 'NAMECOM'] as const
type Tab = typeof TABS[number]

export default async function DomainsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab = 'ALL' } = await searchParams
  const activeTab = (TABS.includes(tab as Tab) ? tab : 'ALL') as Tab

  // Fetch all domains + full relation fields
  const allDomains = await masterDb.tenantDomain.findMany({
    orderBy: { createdAt: 'desc' },
    include: { tenant: { select: { id: true, name: true, subdomain: true } } },
  })

  // Fetch all active tenants for the "Add Domain" modal selector
  const allTenants = await masterDb.tenant.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, subdomain: true },
  })

  // Filter by tab
  const filtered = activeTab === 'ALL'
    ? allDomains
    : activeTab === 'NAMECOM'
      ? allDomains.filter(d => d.source === 'NAMECOM')
      : allDomains.filter(d => d.status === activeTab)

  // Count per tab
  const counts: Record<string, number> = {
    ALL: allDomains.length,
    PENDING_APPROVAL: allDomains.filter(d => d.status === 'PENDING_APPROVAL').length,
    ACTIVE:           allDomains.filter(d => d.status === 'ACTIVE').length,
    FAILED:           allDomains.filter(d => d.status === 'FAILED').length,
    REJECTED:         allDomains.filter(d => d.status === 'REJECTED').length,
    NAMECOM:          allDomains.filter(d => d.source === 'NAMECOM').length,
  }

  // Serialize for client (Prisma Date → string)
  const serialized = filtered.map(d => ({
    ...d,
    source: d.source as string,
    autoConfigured: d.autoConfigured,
    registrar: d.registrar,
    namecomOrderId: d.namecomOrderId,
    purchasedAt: d.purchasedAt ? d.purchasedAt.toISOString() : null,
    expiresAt: d.expiresAt ? d.expiresAt.toISOString() : null,
    verifiedAt: d.verifiedAt ? d.verifiedAt.toISOString() : null,
    approvedAt: d.approvedAt ? d.approvedAt.toISOString() : null,
    rejectedAt: d.rejectedAt ? d.rejectedAt.toISOString() : null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }))

  const statRow = [
    { label: 'Total Domains',    value: counts.ALL,              color: '#00B077', icon: '🌐' },
    { label: 'Pending Approval', value: counts.PENDING_APPROVAL, color: '#f59e0b', icon: '⏳', alert: counts.PENDING_APPROVAL > 0 },
    { label: 'Active',           value: counts.ACTIVE,           color: '#10b981', icon: '🟢' },
    { label: 'DNS Failed',       value: counts.FAILED,           color: '#f43f5e', icon: '❌' },
    { label: 'Name.com',         value: counts.NAMECOM,          color: '#06b6d4', icon: '🛒' },
  ]

  return (
    <>
      <header className="os-topbar">
        <DomainPageHeader tenants={allTenants} />
      </header>

      <div className="os-content">

        {/* Stats Row */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))',
          gap: '0.875rem', marginBottom: '1.5rem',
        }}>
          {statRow.map(s => (
            <div key={s.label} style={{
              padding: '1rem 1.125rem', borderRadius: 14,
              background: 'var(--bg-surface)',
              border: `1px solid ${(s as any).alert ? 'rgba(245,158,11,0.4)' : 'var(--border)'}`,
              position: 'relative', overflow: 'hidden',
            }}>
              {(s as any).alert && (
                <div style={{
                  position: 'absolute', top: 0, right: 0,
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#f59e0b', margin: '0.625rem',
                }} />
              )}
              <p style={{ fontSize: '1.375rem', margin: '0 0 0.25rem' }}>{s.icon}</p>
              <p style={{ fontSize: '1.625rem', fontWeight: 900, color: s.color, margin: 0, lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: '0.3rem 0 0' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* API Status Banner */}
        <div style={{
          padding: '0.875rem 1.25rem', borderRadius: 12, marginBottom: '1.5rem',
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap',
        }}>
          <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            Connected APIs
          </p>
          {[
            { name: 'Vercel', env: 'VERCEL_ACCESS_TOKEN', color: '#00B077' },
            { name: 'Name.com', env: 'NAMECOM_TOKEN', color: '#06b6d4' },
          ].map(api => (
            <div key={api.name} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: process.env[api.env] ? '#10b981' : '#f43f5e',
              }} />
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {api.name}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {process.env[api.env] ? 'Connected' : 'Missing token'}
              </span>
            </div>
          ))}
          <p style={{ margin: '0 0 0 auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Name.com: {process.env.NAMECOM_API_URL ?? 'not set'}
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {TABS.map(t => {
            const isActive = activeTab === t
            const cfg = STATUS_CONFIG[t]
            return (
              <Link key={t} href={`?tab=${t}`} style={{ textDecoration: 'none' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.4375rem 0.875rem', borderRadius: 8,
                  fontSize: '0.8125rem', fontWeight: 600,
                  background: isActive ? cfg.bg : 'var(--bg-raised)',
                  border: `1px solid ${isActive ? cfg.color + '55' : 'var(--border)'}`,
                  color: isActive ? cfg.color : 'var(--text-muted)',
                  cursor: 'pointer', transition: 'all 200ms',
                }}>
                  {t === 'ALL' ? 'All' : t === 'NAMECOM' ? '🛒 Name.com' : t.replace('_', ' ')}
                  <span style={{
                    padding: '0.1rem 0.4rem', borderRadius: 999,
                    fontSize: '0.6875rem', minWidth: 18, textAlign: 'center',
                    background: isActive ? cfg.color + '25' : 'var(--bg-overlay)',
                    color: isActive ? cfg.color : 'var(--text-muted)',
                  }}>{counts[t]}</span>
                </span>
              </Link>
            )
          })}
        </div>

        {/* Domain Table */}
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 16, overflow: 'hidden',
        }}>
          {/* Table Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 130px',
            padding: '0.75rem 1.25rem',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-raised)',
          }}>
            {['Domain', 'Tenant', 'Type', 'Status', 'Actions'].map(h => (
              <span key={h} style={{
                fontSize: '0.6875rem', fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)',
              }}>{h}</span>
            ))}
          </div>

          {/* Interactive rows */}
          {serialized.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>🌐</p>
              <p style={{ margin: 0 }}>No domains in this category.</p>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem' }}>
                Use the <strong>"+ Add Domain"</strong> button to add or purchase a domain.
              </p>
            </div>
          ) : (
            <DomainActionsClient initialDomains={serialized as any} />
          )}
        </div>

        {/* Quick Reference Card */}
        <div style={{
          marginTop: '1.5rem', padding: '1.5rem',
          borderRadius: 16, background: 'var(--bg-surface)', border: '1px solid var(--border)',
        }}>
          <h3 style={{
            fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)',
            margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
            📡 DNS Configuration Reference
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Two ways to connect a custom domain to Nixvra:
          </p>
          <div style={{ display: 'grid', gap: '0.875rem', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {[
              {
                title: '🌐 Method A — External Registrar',
                desc: 'For domains hosted anywhere (GoDaddy, Cloudflare, etc.)',
                steps: [
                  'Add domain → Vercel auto-adds to project',
                  'Copy A or CNAME record from DNS panel',
                  'Set at your registrar → wait up to 48h',
                  'Click "Check DNS" → goes ACTIVE',
                ],
                color: '#00B077',
              },
              {
                title: '🛒 Method B — Buy from Name.com',
                desc: 'Domain purchased + DNS auto-configured in one click',
                steps: [
                  'Search domain availability + price',
                  'Preview order → confirm purchase',
                  'Name.com charges account + registers domain',
                  'DNS auto-set → Vercel auto-added → ACTIVE',
                ],
                color: '#06b6d4',
              },
            ].map(m => (
              <div key={m.title} style={{
                padding: '1.125rem', borderRadius: 12,
                background: 'var(--bg-raised)', border: `1px solid ${m.color}33`,
              }}>
                <p style={{ margin: '0 0 0.375rem', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                  {m.title}
                </p>
                <p style={{ margin: '0 0 0.875rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{m.desc}</p>
                <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {m.steps.map((s, i) => (
                    <li key={i} style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{s}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>

          {/* Standard Records */}
          <div style={{ marginTop: '1.25rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Standard DNS Records
            </p>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {[
                { title: 'CNAME — Subdomain (app.company.com)', type: 'CNAME', name: 'app', value: 'cname.vercel-dns.com', ttl: '300' },
                { title: 'A — Apex/Root (company.com)', type: 'A', name: '@', value: '76.76.21.21', ttl: '300' },
              ].map(r => (
                <div key={r.title} style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <div style={{
                    padding: '0.4rem 0.875rem', background: 'var(--bg-overlay)',
                    borderBottom: '1px solid var(--border)',
                    fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)',
                  }}>{r.title}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', padding: '0.75rem 0.875rem', gap: '0.5rem' }}>
                    {Object.entries({ Type: r.type, Name: r.name, Value: r.value, TTL: r.ttl }).map(([k, v]) => (
                      <div key={k}>
                        <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: '0 0 0.2rem' }}>{k}</p>
                        <code style={{ fontSize: '0.875rem', color: '#818cf8', fontFamily: 'monospace' }}>{v}</code>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </>
  )
}
