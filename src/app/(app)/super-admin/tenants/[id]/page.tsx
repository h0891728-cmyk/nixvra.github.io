import { masterDb, getTenantDb } from '@/lib/db'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import TenantCharts from './_components/TenantCharts'
import TenantActionsBar from './_components/TenantActionsBar'
import TenantDomains from './_components/TenantDomains'
import TenantIntegrations from './_components/TenantIntegrations'
import MarketingHub from '@/components/dashboard/marketing/MarketingHub'
import TenantFinancialERPPanel from './_components/TenantFinancialERPPanel'
import TenantTabs from './_components/TenantTabs'
import TenantModulesTester from './_components/TenantModulesTester'
import TenantModulesLinkCard from './_components/TenantModulesLinkCard'
import TenantBrandingPanel from './_components/TenantBrandingPanel'
import { GoogleBusinessCard } from '@/components/integrations/GoogleBusinessCard'
import TenantGoogleOpsHub from '@/components/super-admin/google/TenantGoogleOpsHub'
import { formatCompactNumber, formatCompactCurrency } from '@/lib/format'

import {
  BuildingIcon, UsersIcon, ShieldIcon, BriefcaseIcon, MailIcon, ActivityIcon, GlobeIcon, LinkIcon,
  CreditCardIcon, MegaphoneIcon, MessageCircleIcon, ZapIcon, CalendarIcon, AnalyticsIcon,
  CheckIcon, CrossIcon, AlertIcon, ClockIcon, BlockIcon
} from '@/components/icons'

const INDUSTRY_COLORS: Record<string, string> = {
  EDUCATION: '#00B077', HEALTHCARE: '#10b981', REAL_ESTATE: '#f59e0b',
  ECOMMERCE: '#06b6d4', SERVICES: '#008E60', OTHER: '#5a5a78',
}
const INDUSTRY_EMOJI: Record<string, any> = {
  EDUCATION: BuildingIcon, HEALTHCARE: ActivityIcon, REAL_ESTATE: BuildingIcon,
  ECOMMERCE: CreditCardIcon, SERVICES: BriefcaseIcon, OTHER: GlobeIcon,
}
const MODULE_ICONS: Record<string, any> = {
  CRM: UsersIcon, BILLING: CreditCardIcon, ADS: MegaphoneIcon, SOCIAL: MessageCircleIcon,
  WEBHOOKS: ZapIcon, SCHEDULING: CalendarIcon, ANALYTICS: AnalyticsIcon, AUDIT: ShieldIcon,
}
const STATUS_COLORS: Record<string, string> = {
  PAID: '#10b981', PENDING: '#f59e0b', FAILED: '#f43f5e',
  REFUNDED: '#06b6d4', PARTIALLY_REFUNDED: '#008E60',
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const tenant = await masterDb.tenant.findUnique({ where: { id }, select: { name: true } })
  return { title: tenant?.name ?? 'Tenant' }
}

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const tenant = await masterDb.tenant.findUnique({
    where: { id },
    include: {
      domains: { orderBy: { createdAt: 'desc' } },
      googleIntegration: true
    },
  })
  if (!tenant) notFound()

  const color = INDUSTRY_COLORS[tenant.industry] ?? '#5a5a78'
  const IconComp = INDUSTRY_EMOJI[tenant.industry] ?? BuildingIcon
  const modules = (tenant.modules as string[]) ?? []

  // Fetch tenant-scoped data
  let users: any[] = []
  let recentTx: any[] = []
  let recentEntities: any[] = []
  let totalUsers = 0, totalEntities = 0, totalRevenue = 0, totalTx = 0
  let monthlyData: { month: string; revenue: number; transactions: number }[] = []
  let statusData: { name: string; value: number; color: string }[] = []
  let activeProviders: string[] = []

  try {
    const db = await getTenantDb(tenant.databaseName)

    const [u, e, allTx, integrationsDB] = await Promise.all([
      db.user.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
      db.businessEntity.findMany({ orderBy: { createdAt: 'desc' }, take: 6 }),
      db.transaction.findMany({ orderBy: { createdAt: 'desc' }, take: 100, select: { amount: true, status: true, createdAt: true, publicId: true, entityId: true, paymentGateway: true } }),
      db.tenantIntegration.findMany({ where: { isActive: true }, select: { provider: true } })
    ])

    users = u
    recentEntities = e
    totalUsers = u.length
    totalEntities = e.length
    totalTx = allTx.length
    activeProviders = integrationsDB.map((i: any) => i.provider)

    // Build monthly revenue data
    const monthMap = new Map<number, { revenue: number; count: number }>()
    for (const tx of allTx) {
      const m = new Date(tx.createdAt).getMonth()
      const existing = monthMap.get(m) ?? { revenue: 0, count: 0 }
      monthMap.set(m, {
        revenue: existing.revenue + (tx.status === 'PAID' ? tx.amount : 0),
        count: existing.count + 1,
      })
    }
    monthlyData = MONTHS.map((name, i) => ({
      month: name,
      revenue: Math.round(monthMap.get(i)?.revenue ?? 0),
      transactions: monthMap.get(i)?.count ?? 0,
    }))

    // Revenue sum
    totalRevenue = allTx.filter(t => t.status === 'PAID').reduce((acc, t) => acc + t.amount, 0)

    // Status breakdown
    const statusMap: Record<string, number> = {}
    for (const tx of allTx) { statusMap[tx.status] = (statusMap[tx.status] ?? 0) + 1 }
    statusData = Object.entries(statusMap).map(([name, value]) => ({
      name, value, color: STATUS_COLORS[name] ?? '#5a5a78',
    }))

    recentTx = allTx.slice(0, 8)
  } catch (_) { }

  const daysOld = Math.floor((Date.now() - new Date(tenant.createdAt).getTime()) / 86400000)

  return (
    <>
      <header className="os-topbar" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/super-admin/tenants" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--bg-raised)', border: '1px solid var(--border)',
            color: 'var(--text-muted)', textDecoration: 'none', fontSize: '1rem',
          }}>←</Link>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: `${color}18`, border: `1px solid ${color}35`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.375rem',
          }}><IconComp style={{ width: 22, height: 22 }} /></div>
          <div>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{tenant.name}</h1>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
              {tenant.subdomain}.nixvra.online · {tenant.databaseName}
            </p>
          </div>
        </div>
        <TenantActionsBar tenant={{
          id: tenant.id, name: tenant.name, industry: tenant.industry, modules: tenant.modules,
          plan: tenant.plan, planStatus: tenant.planStatus, planAmount: tenant.planAmount,
          billingCycle: tenant.billingCycle,
          planExpiryDate: tenant.planExpiryDate ? tenant.planExpiryDate.toISOString() : null,
        }} />
      </header>

      <div className="os-content">
        <TenantTabs
          overview={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
                {[
                  { icon: UsersIcon, label: 'Total Users', value: formatCompactNumber(totalUsers), color: '#00B077' },
                  { icon: BriefcaseIcon, label: 'Business Entities', value: formatCompactNumber(totalEntities), color: '#06b6d4' },
                  { icon: CreditCardIcon, label: 'Transactions', value: formatCompactNumber(totalTx), color: '#008E60' },
                  { icon: ActivityIcon, label: 'Revenue Collected', value: formatCompactCurrency(totalRevenue), color: '#10b981' },
                  { icon: ZapIcon, label: 'Active Modules', value: modules.length, color: '#f59e0b' },
                  { icon: CalendarIcon, label: 'Days Active', value: daysOld, color: '#f43f5e' },
                ].map(s => (
                  <div key={s.label} style={{
                    background: 'var(--bg-surface)', border: '1px solid var(--border)',
                    borderRadius: 14, padding: '1.25rem',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, marginBottom: '0.75rem',
                      background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color,
                    }}>
                      <s.icon style={{ width: 20, height: 20 }} />
                    </div>
                    <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>{s.value}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>{s.label}</p>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: '1.75rem' }}>
                <TenantCharts
                  monthlyData={monthlyData}
                  statusData={statusData}
                  totalRevenue={Math.round(totalRevenue)}
                  totalTransactions={totalTx}
                />
              </div>

              <div className="row g-4">
                <div className="col-12 col-lg-7">
                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Recent Transactions</h3>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{totalTx} total</span>
                    </div>
                    {recentTx.length === 0 ? (
                      <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No transactions yet</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {recentTx.map((tx: any) => (
                          <div key={tx.publicId} style={{
                            display: 'flex', alignItems: 'center', gap: '0.875rem',
                            padding: '0.75rem', borderRadius: 10, background: 'var(--bg-raised)',
                          }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                              background: `${STATUS_COLORS[tx.status] ?? '#5a5a78'}15`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: STATUS_COLORS[tx.status] ?? '#5a5a78',
                            }}>
                              {tx.status === 'PAID' ? <CheckIcon style={{ width: 18, height: 18 }} /> : tx.status === 'FAILED' ? <CrossIcon style={{ width: 18, height: 18 }} /> : tx.status === 'PENDING' ? <ClockIcon style={{ width: 18, height: 18 }} /> : <AlertIcon style={{ width: 18, height: 18 }} />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', margin: 0 }}>
                                {tx.paymentGateway}
                              </p>
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                                {new Date(tx.createdAt).toLocaleDateString('en-IN')}
                              </p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)', margin: 0 }}>
                                ₹{tx.amount.toLocaleString('en-IN')}
                              </p>
                              <span style={{
                                fontSize: '0.6875rem', fontWeight: 600, padding: '0.125rem 0.5rem',
                                borderRadius: 999, background: `${STATUS_COLORS[tx.status] ?? '#5a5a78'}18`,
                                color: STATUS_COLORS[tx.status] ?? '#5a5a78',
                              }}>{tx.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-12 col-lg-5" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>Active Modules</h3>
                    <TenantModulesLinkCard modules={modules} />
                  </div>

                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
                      Users ({totalUsers})
                    </h3>
                    {users.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No users yet</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {users.slice(0, 6).map((u: any) => (
                          <div key={u.publicId} style={{
                            display: 'flex', alignItems: 'center', gap: '0.625rem',
                            padding: '0.625rem', borderRadius: 10, background: 'var(--bg-raised)',
                          }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                              background: `${color}18`, border: `1px solid ${color}35`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.75rem', fontWeight: 700, color,
                            }}>
                              {u.email.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</p>
                              <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: 0 }}>{u.role}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {recentEntities.length > 0 && (
                <div style={{ marginTop: '1.25rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
                    Business Entities ({totalEntities})
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                    {recentEntities.map((e: any) => (
                      <div key={e.publicId} style={{
                        padding: '0.875rem', borderRadius: 10, background: 'var(--bg-raised)',
                        border: '1px solid var(--border)',
                      }}>
                        <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>{e.name}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{e.type} · {e.contact}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(() => {
                const PLAN_COLORS: Record<string, string> = { TRIAL: '#5a5a78', BASIC: '#06b6d4', PRO: '#00B077', ENTERPRISE: '#f59e0b' }
                const STATUS_UI: Record<string, { bg: string, color: string, label: string, icon: any }> = {
                  ACTIVE: { bg: 'rgba(16,185,129,0.12)', color: '#10b981', label: 'Active', icon: CheckIcon },
                  TRIAL: { bg: 'rgba(0,176,119,0.12)', color: '#00B077', label: 'Trial', icon: ClockIcon },
                  EXPIRED: { bg: 'rgba(244,63,94,0.12)', color: '#f43f5e', label: 'Expired', icon: CrossIcon },
                  CANCELLED: { bg: 'rgba(244,63,94,0.12)', color: '#f43f5e', label: 'Cancelled', icon: BlockIcon },
                  SUSPENDED: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'Suspended', icon: AlertIcon },
                }
                const planColor = PLAN_COLORS[tenant.plan] ?? '#5a5a78'
                const statusInfo = STATUS_UI[tenant.planStatus] ?? STATUS_UI.TRIAL

                const isExpiringSoon = tenant.planExpiryDate
                  ? (new Date(tenant.planExpiryDate).getTime() - Date.now()) < 7 * 86400000
                  : false

                return (
                  <div style={{
                    marginTop: '1.25rem', padding: '1.5rem',
                    borderRadius: 16, background: 'var(--bg-surface)',
                    border: `1px solid ${planColor}30`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="material-symbols-outlined">diamond</span> Subscription Plan
                      </h3>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: statusInfo.bg, color: statusInfo.color, padding: '0.375rem 0.75rem', borderRadius: 999, fontSize: '0.8125rem', fontWeight: 700 }}>
                        <statusInfo.icon style={{ width: 14, height: 14 }} /> {statusInfo.label}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
                      <div style={{ padding: '1rem', borderRadius: 12, background: `${planColor}10`, border: `1px solid ${planColor}25`, textAlign: 'center' }}>
                        <p style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', margin: '0 0 0.375rem' }}>Plan</p>
                        <p style={{ fontSize: '1.25rem', fontWeight: 900, color: planColor, margin: 0 }}>{tenant.plan}</p>
                      </div>
                      <div style={{ padding: '1rem', borderRadius: 12, background: 'var(--bg-raised)', border: '1px solid var(--border)', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', margin: '0 0 0.375rem' }}>Amount</p>
                        <p style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10b981', margin: 0 }}>₹{tenant.planAmount.toLocaleString('en-IN')}</p>
                        <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>per {tenant.billingCycle.toLowerCase()}</p>
                      </div>
                      <div style={{ padding: '1rem', borderRadius: 12, background: 'var(--bg-raised)', border: '1px solid var(--border)', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', margin: '0 0 0.375rem' }}>Started</p>
                        <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                          {new Date(tenant.planStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div style={{
                        padding: '1rem', borderRadius: 12, textAlign: 'center',
                        background: isExpiringSoon ? 'rgba(244,63,94,0.1)' : 'var(--bg-raised)',
                        border: `1px solid ${isExpiringSoon ? 'rgba(244,63,94,0.3)' : 'var(--border)'}`,
                      }}>
                        <p style={{ fontSize: '0.75rem', color: isExpiringSoon ? '#f43f5e' : 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                          {isExpiringSoon && <AlertIcon style={{ width: 12, height: 12 }} />} {isExpiringSoon ? 'Expires Soon' : 'Expiry Date'}
                        </p>
                        <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: isExpiringSoon ? '#f43f5e' : 'var(--text-primary)', margin: 0 }}>
                          {tenant.planExpiryDate
                            ? new Date(tenant.planExpiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                            : 'No expiry'}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })()}

              <div style={{
                marginTop: '1.25rem', padding: '1.25rem 1.5rem',
                borderRadius: 14, background: 'var(--bg-raised)',
                border: '1px solid var(--border)',
                display: 'flex', gap: '2rem', flexWrap: 'wrap',
              }}>
                {[
                  { label: 'Database', value: tenant.databaseName },
                  { label: 'Created', value: new Date(tenant.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) },
                  { label: 'Last Updated', value: new Date(tenant.updatedAt).toLocaleDateString('en-IN') },
                  { label: 'Isolation', value: tenant.isIsolated ? <><span className="material-symbols-outlined" style={{ verticalAlign: 'middle', fontSize: '1.2em' }}>lock</span> Isolated DB</> : <><span className="material-symbols-outlined" style={{ verticalAlign: 'middle', fontSize: '1.2em' }}>lock_open</span> Shared DB</> },
                ].map(info => (
                  <div key={info.label}>
                    <p style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', margin: 0 }}>{info.label}</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0.125rem 0 0', fontFamily: info.label === 'Database' ? 'monospace' : undefined }}>{info.value}</p>
                  </div>
                ))}
              </div>
            </div>
          }
          modules={
            <>
              <TenantModulesTester activeModules={modules} />
            </>
          }
          domains={
            <>
              <TenantDomains
                tenantId={tenant.id}
                isSuperAdmin={true}
                initialDomains={tenant.domains.map(d => ({
                  id: d.id, domain: d.domain, type: d.type, status: d.status,
                  source: d.source as string,
                  autoConfigured: d.autoConfigured,
                  registrar: d.registrar ?? null,
                  namecomOrderId: d.namecomOrderId ?? null,
                  verifyToken: d.verifyToken, dnsTarget: d.dnsTarget, sslStatus: d.sslStatus,
                  approvedAt: d.approvedAt?.toISOString() ?? null,
                  verifiedAt: d.verifiedAt?.toISOString() ?? null,
                  rejectedAt: d.rejectedAt?.toISOString() ?? null,
                  rejectionReason: d.rejectionReason ?? null,
                  createdAt: d.createdAt.toISOString(),
                }))}
              />
            </>
          }
          marketing={
            <>
              <MarketingHub tenantId={tenant.id} isSuperAdmin={true} />
            </>
          }
          erp={
            <>
              <TenantFinancialERPPanel tenantId={tenant.id} />
            </>
          }
          integrations={
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <GoogleBusinessCard
                  isConnected={!!(tenant as any).googleIntegration}
                  connectedEmail={(tenant as any).googleIntegration?.email ?? undefined}
                  targetTenantId={tenant.id}
                />
              </div>
              <TenantIntegrations
                tenantId={tenant.id}
                activeProviders={activeProviders}
              />
            </>
          }
          branding={
            <TenantBrandingPanel
              tenantId={tenant.id}
              subdomain={tenant.subdomain}
              industry={tenant.industry}
              initialLogoUrl={(tenant as any).logoUrl ?? null}
              initialTagline={(tenant as any).tagline ?? null}
              initialPrimaryColor={(tenant as any).primaryColor ?? '#00B077'}
            />
          }
          googleOps={
            <TenantGoogleOpsHub tenantId={tenant.id} />
          }
        />
      </div>
    </>
  )
}