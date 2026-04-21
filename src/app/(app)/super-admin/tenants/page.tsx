import { masterDb, getTenantDb } from '@/lib/db'
import type { Metadata } from 'next'
import Link from 'next/link'
import { impersonateTenantAction } from '@/actions/auth'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Tenants' }

const INDUSTRY_COLORS: Record<string, string> = {
  EDUCATION: '#00B077', HEALTHCARE: '#10b981', REAL_ESTATE: '#f59e0b',
  AGENCY: '#008E60', ECOMMERCE: '#06b6d4', HOSPITALITY: '#f43f5e',
  LEGAL: '#94a3b8', FINANCE: '#22c55e', SERVICES: '#008E60', OTHER: '#5a5a78',
}

const INDUSTRY_ICONS: Record<string, string> = {
  EDUCATION: 'school', HEALTHCARE: 'local_hospital', REAL_ESTATE: 'real_estate_agent', AGENCY: 'rocket_launch',
  ECOMMERCE: 'shopping_cart', HOSPITALITY: 'hotel', LEGAL: 'gavel', FINANCE: 'attach_money',
  SERVICES: 'settings', OTHER: 'build',
}

async function getTenants() {
  const tenants = await masterDb.tenant.findMany({ orderBy: { createdAt: 'desc' } })

  const mappedData = await Promise.all(tenants.map(async (t) => {
    let _count = { users: 0, businessEntities: 0, transactions: 0 }
    try {
      const db = await getTenantDb(t.databaseName)
      const [u, e, tx] = await Promise.all([
        db.user.count(),
        db.businessEntity.count(),
        db.transaction.count(),
      ])
      _count = { users: u, businessEntities: e, transactions: tx }
    } catch (_) { }
    return { ...t, _count }
  }))

  return mappedData
}

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page = '1' } = await searchParams
  const tenants = await getTenants()
  const pageSize = 12
  const requestedPage = Number.parseInt(page, 10)
  const totalPages = Math.max(1, Math.ceil(tenants.length / pageSize))
  const currentPage = Number.isFinite(requestedPage) ? Math.min(Math.max(requestedPage, 1), totalPages) : 1
  const paginatedTenants = tenants.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const industryCounts = tenants.reduce((acc, t) => {
    acc[t.industry] = (acc[t.industry] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  function pageHref(targetPage: number) {
    return `/super-admin/tenants?page=${targetPage}`
  }

  return (
    <>
      <header className="os-topbar">
        <div>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#00B077' }}>
              <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
            </svg>
            Tenants
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
            Manage all registered tenants on Nixvra
          </p>
        </div>
        <Link href="/super-admin/tenants/new" id="btn-create-tenant" className="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create Tenant
        </Link>
      </header>

      <div className="os-content fade-in">

        {/* Summary bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
          <div className="stat-card">
            <div className="stat-value">{tenants.length}</div>
            <div className="stat-label">Total Tenants</div>
          </div>
          {Object.entries(industryCounts).slice(0, 3).map(([industry, count]) => (
            <div key={industry} className="stat-card">
              <div className="stat-value">{Number(count)}</div>
              <div className="stat-label">{industry.charAt(0) + industry.slice(1).toLowerCase().replace(/_/g, ' ')}</div>
            </div>
          ))}
        </div>

        {/* Tenants Grid */}
        {tenants.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 1.5rem' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem', opacity: 0.5, marginInline: 'auto' }}>
              <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
            </svg>
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>No tenants yet</h3>
            <p style={{ marginBottom: '1.5rem' }}>Create your first tenant to get started.</p>
            <Link href="/super-admin/tenants/new" className="btn btn-primary" id="btn-first-tenant">
              Create first tenant
            </Link>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '1.25rem' }}>
              {paginatedTenants.map((tenant) => {
                const color = INDUSTRY_COLORS[tenant.industry] ?? '#5a5a78'
                const emoji = INDUSTRY_ICONS[tenant.industry] ?? 'build'
                const modules = Array.isArray(tenant.modules) ? tenant.modules as unknown as string[] : []
                return (
                  <div key={tenant.id} style={{ position: 'relative' }}>
                    <Link
                      href={`/super-admin/tenants/${tenant.id}`}
                      id={`tenant-card-${tenant.id}`}
                      style={{ textDecoration: 'none' }}
                    >
                      <article className="card" style={{ cursor: 'pointer', height: '100%' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                          <div style={{
                            width: 44, height: 44, borderRadius: 'var(--radius)',
                            background: `${color}18`, border: `1px solid ${color}35`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.25rem', flexShrink: 0,
                          }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>{emoji}</span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h3 style={{
                              fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)',
                              margin: 0, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                              {tenant.name}
                            </h3>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                              {tenant.subdomain}.nixvra.online
                            </p>
                          </div>
                          <span style={{
                            background: `${color}18`, color, fontSize: '0.6875rem', fontWeight: 600,
                            padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-full)', flexShrink: 0,
                          }}>
                            {tenant.industry}
                          </span>
                        </div>

                        {/* Stats row */}
                        <div style={{
                          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                          gap: '0.5rem', marginBottom: '1rem',
                          padding: '0.75rem', background: 'var(--bg-raised)',
                          borderRadius: 'var(--radius)',
                        }}>
                          {[
                            { label: 'Users', value: tenant._count.users },
                            { label: 'Entities', value: tenant._count.businessEntities },
                            { label: 'Invoices', value: tenant._count.transactions },
                          ].map((s) => (
                            <div key={s.label} style={{ textAlign: 'center' }}>
                              <p style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
                                {s.value}
                              </p>
                              <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: '0.125rem 0 0' }}>
                                {s.label}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Modules */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', paddingBottom: '2.5rem' }}>
                          {modules.slice(0, 5).map((m) => (
                            <span key={m} className="badge badge-muted" style={{ fontSize: '0.6875rem' }}>{m}</span>
                          ))}
                          {modules.length > 5 && (
                            <span className="badge badge-muted" style={{ fontSize: '0.6875rem' }}>+{modules.length - 5}</span>
                          )}
                        </div>
                      </article>
                    </Link>

                    {/* Impersonation Action */}
                    <form
                      action={impersonateTenantAction.bind(null, tenant.id)}
                      style={{ position: 'absolute', bottom: '1rem', right: '1rem', zIndex: 10 }}
                    >
                      <button
                        type="submit"
                        title="Login as Tenant Admin"
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                          padding: '0.4rem 0.75rem',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: color }}>bolt</span>
                        GHOST LOGIN
                      </button>
                    </form>
                  </div>
                )
              })}
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              paddingTop: '1rem',
              flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, tenants.length)} of {tenants.length} tenants
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <Link
                  href={pageHref(Math.max(1, currentPage - 1))}
                  style={{
                    padding: '0.38rem 0.7rem',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-surface)',
                    color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    pointerEvents: currentPage === 1 ? 'none' : 'auto',
                    opacity: currentPage === 1 ? 0.6 : 1,
                  }}
                >
                  Prev
                </Link>
                {Array.from({ length: totalPages }, (_, index) => index + 1)
                  .filter((itemPage) => itemPage === 1 || itemPage === totalPages || Math.abs(itemPage - currentPage) <= 1)
                  .map((itemPage, index, arr) => (
                    <span key={itemPage}>
                      {index > 0 && itemPage - arr[index - 1] > 1 && (
                        <span style={{ padding: '0 0.3rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>...</span>
                      )}
                      <Link
                        href={pageHref(itemPage)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: 34,
                          height: 34,
                          padding: '0 0.55rem',
                          borderRadius: 8,
                          border: `1px solid ${itemPage === currentPage ? 'rgba(0,176,119,0.24)' : 'var(--border)'}`,
                          background: itemPage === currentPage ? 'rgba(0,176,119,0.12)' : 'var(--bg-surface)',
                          color: itemPage === currentPage ? '#00B077' : 'var(--text-primary)',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          textDecoration: 'none',
                          marginInline: '0.2rem',
                        }}
                      >
                        {itemPage}
                      </Link>
                    </span>
                  ))}
                <Link
                  href={pageHref(Math.min(totalPages, currentPage + 1))}
                  style={{
                    padding: '0.38rem 0.7rem',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-surface)',
                    color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    pointerEvents: currentPage === totalPages ? 'none' : 'auto',
                    opacity: currentPage === totalPages ? 0.6 : 1,
                  }}
                >
                  Next
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
