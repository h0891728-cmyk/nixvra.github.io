import { masterDb, getTenantDb } from '@/lib/db'
import { getSession } from '@/lib/session'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getSuperAdminAnalytics } from '@/actions/analytics'
import AnalyticsCharts from './_components/AnalyticsCharts'
import {
  BuildingIcon, UsersIcon, PersonIcon, CreditCardIcon as CashIcon,
  MegaphoneIcon, CalendarIcon, ZapIcon, PlugIcon, GlobeIcon
} from '@/components/icons'
import ThemeToggle from './_components/ThemeToggle'
import { formatCompactNumber, formatCompactCurrency } from '@/lib/format'

export const metadata: Metadata = { title: 'Overview' }

// ── Server-side data fetching ──
async function getDashboardStats() {
  const allTenants = await masterDb.tenant.findMany({ select: { databaseName: true } })

  let totalUsers = 0, totalEntities = 0, totalRevenue = 0, totalWebhooks = 0, totalCampaigns = 0, totalPosts = 0

  for (const t of allTenants) {
    try {
      const db = await getTenantDb(t.databaseName)
      const [u, e, rev, w, c, p] = await Promise.all([
        db.user.count(),
        db.businessEntity.count(),
        db.transaction.aggregate({ _sum: { amount: true }, where: { status: 'PAID' } }),
        db.webhookEvent.count({ where: { status: 'PENDING' } }),
        db.adCampaign.count({ where: { status: 'ACTIVE' } }),
        db.socialPost.count({ where: { status: 'SCHEDULED' } }),
      ])
      totalUsers += u
      totalEntities += e
      totalRevenue += rev._sum.amount ?? 0
      totalWebhooks += w
      totalCampaigns += c
      totalPosts += p
    } catch (_) { }
  }

  return {
    tenants: allTenants.length,
    users: totalUsers,
    entities: totalEntities,
    revenue: totalRevenue,
    pendingWebhooks: totalWebhooks,
    activeCampaigns: totalCampaigns,
    scheduledPosts: totalPosts,
  }
}

async function getDomainStats() {
  const [total, pending, active, failed, namecom] = await Promise.all([
    masterDb.tenantDomain.count(),
    masterDb.tenantDomain.count({ where: { status: 'PENDING_APPROVAL' } }),
    masterDb.tenantDomain.count({ where: { status: 'ACTIVE' } }),
    masterDb.tenantDomain.count({ where: { status: 'FAILED' } }),
    masterDb.tenantDomain.count({ where: { source: 'NAMECOM' } }),
  ])
  return { total, pending, active, failed, namecom }
}

async function getRecentTenants() {
  return masterDb.tenant.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, name: true, subdomain: true, industry: true, createdAt: true, modules: true },
  })
}

async function getRecentWebhooks() {
  const allTenants = await masterDb.tenant.findMany({ select: { databaseName: true } })
  const webhooks: any[] = []
  for (const t of allTenants) {
    try {
      const db = await getTenantDb(t.databaseName)
      const w = await db.webhookEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { publicId: true, source: true, status: true, createdAt: true },
      })
      webhooks.push(...w.map((event: any) => ({ ...event, tenantId: t.databaseName })))
    } catch (_) { }
  }
  return webhooks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 5)
}

const INDUSTRY_COLORS: Record<string, string> = {
  EDUCATION: '#00B077', HEALTHCARE: '#10b981', REAL_ESTATE: '#f59e0b',
  ECOMMERCE: '#06b6d4', SERVICES: '#008E60', OTHER: '#5a5a78',
}

const STATUS_DOT: Record<string, string> = {
  PROCESSED: '#10b981', FAILED: '#f43f5e', PENDING: '#f59e0b', IGNORED: '#5a5a78',
}
const STATUS_BG: Record<string, string> = {
  PROCESSED: 'rgba(16,185,129,0.15)', FAILED: 'rgba(244,63,94,0.15)',
  PENDING: 'rgba(245,158,11,0.15)', IGNORED: 'rgba(90,90,120,0.15)',
}

const QUICK_ACTIONS = [
  { label: 'New Tenant', href: '/super-admin/tenants/new', icon: BuildingIcon, color: '#00B077' },
  { label: 'Integrations', href: '/super-admin/integrations', icon: PlugIcon, color: '#008E60' },
  { label: 'Manage Domains', href: '/super-admin/domains', icon: GlobeIcon, color: '#06b6d4' },
  { label: 'Schedule Post', href: '/super-admin/social/new', icon: CalendarIcon, color: '#f43f5e' },
  { label: 'New Campaign', href: '/super-admin/ads/new', icon: MegaphoneIcon, color: '#f59e0b' },
  { label: 'Add Entity', href: '/super-admin/entities/new', icon: PersonIcon, color: '#10b981' },
]

export default async function SuperAdminOverviewPage() {
  const [session, stats, domainStats, recentTenants, recentWebhooks, analyticsData] = await Promise.all([
    getSession(),
    getDashboardStats(),
    getDomainStats(),
    getRecentTenants(),
    getRecentWebhooks(),
    getSuperAdminAnalytics(365),
  ])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <>
      {/* Top bar */}
      <header className="os-topbar">
        <div>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>
            {greeting}, {session?.email?.split('@')[0]}

          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
            Platform overview · {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ThemeToggle />
          <Link href="/super-admin/tenants/new" id="btn-new-tenant" className="btn btn-primary btn-sm">
            <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>add</span>
            New Tenant
          </Link>
        </div>
      </header>

      <div className="os-content fade-in">
        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <StatCard label="Total Tenants" value={formatCompactNumber(stats.tenants)} color="#00B077" icon={<BuildingIcon />} />
          <StatCard label="Total Users" value={formatCompactNumber(stats.users)} color="#008E60" icon={<UsersIcon />} />
          <StatCard label="Business Entities" value={formatCompactNumber(stats.entities)} color="#06b6d4" icon={<PersonIcon />} />
          <StatCard label="Revenue Collected" value={formatCompactCurrency(stats.revenue as number)} color="#10b981" icon={<CashIcon />} />
          <StatCard label="Active Campaigns" value={formatCompactNumber(stats.activeCampaigns)} color="#f59e0b" icon={<MegaphoneIcon />} />
          <StatCard label="Scheduled Posts" value={formatCompactNumber(stats.scheduledPosts)} color="#f43f5e" icon={<CalendarIcon />} />
          <StatCard label="Pending Webhooks" value={formatCompactNumber(stats.pendingWebhooks)} color={stats.pendingWebhooks > 10 ? '#f43f5e' : '#5a5a78'} icon={<ZapIcon />} />
          <StatCard
            label="Domains Pending"
            value={formatCompactNumber(domainStats.pending)}
            color={domainStats.pending > 0 ? '#f59e0b' : '#10b981'}
            icon={<GlobeIcon />}
            href="/super-admin/domains?tab=PENDING_APPROVAL"
            badge={domainStats.total > 0 ? `${formatCompactNumber(domainStats.active)} active` : undefined}
          />
        </div>

        {/* Analytics Charts */}
        <AnalyticsCharts data={analyticsData} />

        {/* Two-column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 420px), 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>

          {/* Recent Tenants */}
          <section className="card" aria-labelledby="recent-tenants-heading">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 id="recent-tenants-heading" style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Recent Tenants
              </h2>
              <Link href="/super-admin/tenants" className="btn btn-ghost btn-sm">View all →</Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {recentTenants.map((t: any) => (
                <Link key={t.id} href={`/super-admin/tenants/${t.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem', borderRadius: 'var(--radius)',
                    background: 'var(--bg-raised)',
                    transition: 'background var(--transition)',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 'var(--radius)',
                      background: `${INDUSTRY_COLORS[t.industry] ?? '#5a5a78'}22`,
                      border: `1px solid ${INDUSTRY_COLORS[t.industry] ?? '#5a5a78'}44`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.875rem', fontWeight: 700,
                      color: INDUSTRY_COLORS[t.industry] ?? '#5a5a78', flexShrink: 0,
                    }}>
                      {t.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.name}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                        {t.subdomain}.nixvra.online
                      </p>
                    </div>
                    <span style={{
                      padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-full)', fontSize: '0.6875rem', fontWeight: 600,
                      background: `${INDUSTRY_COLORS[t.industry] ?? '#5a5a78'}22`,
                      color: INDUSTRY_COLORS[t.industry] ?? '#5a5a78', flexShrink: 0,
                    }}>{t.industry}</span>
                  </div>
                </Link>
              ))}
              {recentTenants.length === 0 && (
                <p style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>No tenants yet.</p>
              )}
            </div>
          </section>

          {/* Recent Webhooks */}
          <section className="card" aria-labelledby="webhook-heading">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 id="webhook-heading" style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Recent Webhooks</h2>
              <Link href="/super-admin/webhooks" className="btn btn-ghost btn-sm">View all →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {recentWebhooks.map((w: any) => (
                <div key={w.publicId} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 1rem', borderRadius: 'var(--radius)',
                  background: 'var(--bg-raised)',
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_DOT[w.status] ?? '#5a5a78', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)', margin: 0 }}>{w.source}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                      {new Date(w.createdAt).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <span style={{
                    padding: '0.2rem 0.625rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600,
                    background: STATUS_BG[w.status] ?? 'var(--bg-overlay)',
                    color: STATUS_DOT[w.status] ?? 'var(--text-muted)',
                  }}>{w.status}</span>
                </div>
              ))}
              {recentWebhooks.length === 0 && (
                <p style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>No webhook events yet.</p>
              )}
            </div>
          </section>
        </div>

        {/* Quick Actions */}
        <section>
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.875rem' }}>Quick Actions</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.875rem' }}>
            {QUICK_ACTIONS.map((action) => (
              <Link key={action.href} href={action.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'var(--bg-surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)', padding: '1.25rem',
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.75rem',
                  transition: 'all var(--transition)', cursor: 'pointer',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 'var(--radius)',
                    background: `${action.color}18`, border: `1px solid ${action.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: action.color,
                  }}>
                    <action.icon style={{ width: 20, height: 20 }} />
                  </div>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{action.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}

// ── StatCard ──
function StatCard({ label, value, color, icon, href, badge }: {
  label: string; value: string | number; color: string;
  icon: React.ReactNode; href?: string; badge?: string
}) {
  const content = (
    <div className="stat-card" style={{
      cursor: href ? 'pointer' : 'default',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: `${color}25`, // Increased transparency slightly
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color
        }}>
          {icon}
        </div>
        {badge && (
          <span className="badge" style={{
            background: `${color}15`,
            color: color,
            fontSize: '0.7rem'
          }}>{badge}</span>
        )}
      </div>
      <div>
        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{value}</div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      </div>
    </div>
  )
  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{content}</Link> : content
}
