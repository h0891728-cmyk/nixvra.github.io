'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { type TenantIntegrationSummary } from '@/actions/master-integrations'
import { PLATFORM_META } from './IntegrationCard'
import ConnectionStatusBadge from './ConnectionStatusBadge'
import PaginationControls from '@/components/ui/PaginationControls'

type Props = {
  integrations: TenantIntegrationSummary[]
  filterPlatform?: string
}

export default function TenantConnectionTable({ integrations, filterPlatform }: Props) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [sortBy, setSortBy] = useState<'tenant' | 'platform' | 'status'>('tenant')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 12

  const filtered = useMemo(() => {
    let rows = [...integrations]
    if (filterPlatform) rows = rows.filter(r => r.provider === filterPlatform)
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(r =>
        r.tenantName.toLowerCase().includes(q) ||
        r.tenantSubdomain.toLowerCase().includes(q) ||
        r.provider.toLowerCase().includes(q)
      )
    }
    if (filterStatus === 'active')   rows = rows.filter(r => r.isActive)
    if (filterStatus === 'inactive') rows = rows.filter(r => !r.isActive)
    rows.sort((a, b) => {
      if (sortBy === 'tenant')   return a.tenantName.localeCompare(b.tenantName)
      if (sortBy === 'platform') return a.provider.localeCompare(b.provider)
      if (sortBy === 'status')   return Number(b.isActive) - Number(a.isActive)
      return 0
    })
    return rows
  }, [integrations, filterPlatform, search, filterStatus, sortBy])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, filterStatus, sortBy, filterPlatform, integrations.length])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Search tenant or platform..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="form-input"
          style={{ flex: '1 1 200px', minWidth: 160 }}
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')} className="form-input" style={{ width: 130 }}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as 'tenant' | 'platform' | 'status')} className="form-input" style={{ width: 130 }}>
          <option value="tenant">Sort: Tenant</option>
          <option value="platform">Sort: Platform</option>
          <option value="status">Sort: Status</option>
        </select>
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
          {filtered.length} row{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
              {['Tenant', 'Platform', 'Status', 'Token', 'API Key', 'Connected'].map(h => (
                <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.6875rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No integrations found
                </td>
              </tr>
            ) : paginatedRows.map((r, i) => {
              const pm = PLATFORM_META[r.provider]
              return (
                <tr key={`${r.tenantId}-${r.provider}-${i}`} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-raised)' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.tenantName}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{r.tenantSubdomain}</div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                        background: `${pm?.color || '#00B077'}18`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 900, color: pm?.color || '#00B077',
                      }}>
                        {pm?.icon || '?'}
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {pm?.label || r.provider}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <ConnectionStatusBadge isActive={r.isActive} hasCredentials={r.isActive || r.hasToken || r.hasKey} />
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ fontSize: '0.75rem', color: r.hasToken ? '#10b981' : 'var(--text-muted)', fontWeight: 600 }}>
                      {r.hasToken ? '✓ Present' : '—'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ fontSize: '0.75rem', color: r.hasKey ? '#10b981' : 'var(--text-muted)', fontWeight: 600 }}>
                      {r.hasKey ? '✓ Present' : '—'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {r.connectedAt ? new Date(r.connectedAt).toLocaleDateString('en-IN') : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <PaginationControls
        currentPage={safePage}
        totalItems={filtered.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        itemLabel="connections"
      />
    </div>
  )
}
