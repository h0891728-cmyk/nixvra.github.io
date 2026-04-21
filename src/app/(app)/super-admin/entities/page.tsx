import { masterDb, getTenantDb } from '@/lib/db'
import Link from 'next/link'
import type { Metadata } from 'next'
import GlobalEntitiesClient from './_components/GlobalEntitiesClient'
import TenantSelector from '../_components/TenantSelector'

export const metadata: Metadata = { title: 'Global Entities Management' }

const ENTITY_EMOJIS: Record<string, string> = {
  STUDENT: '🎓', PATIENT: '🏥', LEAD: '🎯', 
  AGENT: '🕵️', CUSTOMER: '🛍️', VENDOR: '🤝'
}

export default async function GlobalEntitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ tenantId?: string }>
}) {
  const { tenantId = 'ALL' } = await searchParams

  const tenants = await masterDb.tenant.findMany({
    orderBy: { createdAt: 'desc' },
  })

  let rawEntities: any[] = []
  
  if (tenantId === 'ALL') {
    // ── Hybrid Aggregation (Cross-Database) ──
    const targetTenants = tenants.slice(0, 10) 
    
    const results = await Promise.allSettled(
      targetTenants.map(async t => {
        const db = await getTenantDb(t.databaseName)
        const e = await db.businessEntity.findMany({
          orderBy: { createdAt: 'desc' },
          take: 20,
        })
        return e.map((entity: any) => ({
          ...entity,
          id: entity.id.toString(),
          tenantId: t.id,
          tenantName: t.name,
          tenantDb: t.databaseName,
        }))
      })
    )

    results.forEach(res => {
      if (res.status === 'fulfilled') {
        rawEntities.push(...res.value)
      }
    })
    
    rawEntities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    rawEntities = rawEntities.slice(0, 100)
    
  } else {
    // ── Single Tenant Mode ──
    const tenant = tenants.find(t => t.id === tenantId)
    if (tenant) {
      const db = await getTenantDb(tenant.databaseName)
      const e = await db.businessEntity.findMany({
        orderBy: { createdAt: 'desc' },
      })
      rawEntities = e.map((entity: any) => ({
        ...entity,
        id: entity.id.toString(),
        tenantId: tenant.id,
        tenantName: tenant.name,
        tenantDb: tenant.databaseName,
      }))
    }
  }

  // Count types for stats
  const typeMetrics: Record<string, number> = {}
  rawEntities.forEach(e => {
    typeMetrics[e.type] = (typeMetrics[e.type] || 0) + 1
  })

  return (
    <>
      <header className="os-topbar">
        <div>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#06b6d4' }}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            Global Entities (CRM)
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
            Overview of all Companies, Customers, and Records across tenants
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
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.25rem' }}>Total Entities</p>
            <p style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>{rawEntities.length}</p>
          </div>
          {Object.entries(typeMetrics).map(([type, count]) => (
            <div key={type} style={{ 
              padding: '1.25rem', borderRadius: 14, background: 'var(--bg-surface)', 
              border: '1px solid var(--border)'
            }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.25rem' }}>{type}</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>{count}</p>
            </div>
          ))}
        </div>

        <GlobalEntitiesClient entities={rawEntities} />

      </div>
    </>
  )
}
