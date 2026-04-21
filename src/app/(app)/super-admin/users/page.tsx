import { masterDb, getTenantDb } from '@/lib/db'
import Link from 'next/link'
import type { Metadata } from 'next'
import GlobalUsersClient from './_components/GlobalUsersClient'
import TenantSelector from '../_components/TenantSelector'

export const metadata: Metadata = { title: 'Global User Management' }

export default async function GlobalUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ tenantId?: string }>
}) {
  const { tenantId = 'ALL' } = await searchParams

  // Fetch all tenants to populate the selector
  const tenants = await masterDb.tenant.findMany({
    orderBy: { createdAt: 'desc' },
  })

  let rawUsers: any[] = []
  
  if (tenantId === 'ALL') {
    // ── Hybrid Aggregation (Cross-Database) ──
    const targetTenants = tenants.slice(0, 10) // Limit to top 10 for performance
    
    const results = await Promise.allSettled(
      targetTenants.map(async t => {
        const db = await getTenantDb(t.databaseName)
        const u = await db.user.findMany({
          orderBy: { createdAt: 'desc' },
          take: 20,
        })
        return u.map((user: any) => ({
          ...user,
          id: user.id.toString(), // Prisma BigInt to string
          tenantId: t.id,
          tenantName: t.name,
          tenantDb: t.databaseName,
        }))
      })
    )

    results.forEach(res => {
      if (res.status === 'fulfilled') {
        rawUsers.push(...res.value)
      }
    })
    
    // Global sorting
    rawUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    rawUsers = rawUsers.slice(0, 100)
    
  } else {
    // ── Single Tenant Mode ──
    const tenant = tenants.find(t => t.id === tenantId)
    if (tenant) {
      const db = await getTenantDb(tenant.databaseName)
      const u = await db.user.findMany({
        orderBy: { createdAt: 'desc' },
      })
      rawUsers = u.map((user: any) => ({
        ...user,
        id: user.id.toString(),
        tenantId: tenant.id,
        tenantName: tenant.name,
        tenantDb: tenant.databaseName,
      }))
    }
  }

  // Count roles for stats
  const roleMetrics: Record<string, number> = {}
  rawUsers.forEach(u => {
    roleMetrics[u.role] = (roleMetrics[u.role] || 0) + 1
  })

  return (
    <>
      <header className="os-topbar">
        <div>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#818cf8' }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Global Users
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
            Manage users across all isolated tenant databases
          </p>
        </div>
        
        {/* Tenant Selector */}
        <div>
          <TenantSelector tenants={tenants} defaultValue={tenantId} />
        </div>
      </header>

      <div className="os-content">
        {/* Top Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ padding: '1.25rem', borderRadius: 14, background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.25rem' }}>Total Showing</p>
            <p style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>{rawUsers.length}</p>
          </div>
          {Object.entries(roleMetrics).map(([role, count]) => {
            const colors: Record<string, string> = { SUPER_ADMIN: '#f43f5e', TENANT_ADMIN: '#008E60', STAFF: '#06b6d4', CUSTOMER: '#10b981' }
            const c = colors[role] || '#00B077'
            return (
              <div key={role} style={{ 
                padding: '1.25rem', borderRadius: 14, background: 'var(--bg-surface)', 
                border: '1px solid var(--border)', borderTop: `3px solid ${c}`
              }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.25rem' }}>{role}</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 900, color: c, margin: 0, lineHeight: 1 }}>{count}</p>
              </div>
            )
          })}
        </div>

        <GlobalUsersClient users={rawUsers} />

      </div>
    </>
  )
}
