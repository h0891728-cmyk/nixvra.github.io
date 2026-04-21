'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { getGlobalAuditLogs } from '@/actions/super-admin-audit'
import PaginationControls from '@/components/ui/PaginationControls'

function TenantBadge({ tenant }: { tenant: { name: string; subdomain: string } }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-overlay)', padding: '0.2rem 0.5rem', borderRadius: 8, border: '1px solid var(--border)', width: 'fit-content' }}>
      <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', color: '#00B077' }}>corporate_fare</span>
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{tenant.name}</span>
    </div>
  )
}

export default function GlobalAuditClient() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getGlobalAuditLogs(150)
    setLogs(data)
    setCurrentPage(1)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const totalPages = Math.max(1, Math.ceil(logs.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedLogs = logs.slice((safePage - 1) * pageSize, safePage * pageSize)

  return (
    <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.75rem', color: '#00B077' }}>gavel</span>
            System Delivery Logs
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
            Unified cross-tenant action traceability. Identifies creation and destruction events occurring on the platform.
          </p>
        </div>
        <button onClick={() => load()} disabled={loading} style={{ padding: '0.45rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>refresh</span>
        </button>
      </div>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Active Audit Flow</h3>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>Intercepting network...</span>
          </div>
          {loading ? (
             <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Pulling historical signatures cross-tenant...</div>
          ) : logs.length === 0 ? (
             <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No audit events recorded.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-raised)' }}>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Timestamp</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tenant Node</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Action</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Context details</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogs.map(log => (
                    <tr key={`${log.tenant.id}-${log.publicId}`} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        {new Date(log.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                      <td style={{ padding: '1rem' }}>
                         <TenantBadge tenant={log.tenant} />
                      </td>
                      <td style={{ padding: '1rem' }}>
                         <span style={{ padding: '0.2rem 0.5rem', background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 6, fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                           {log.action}
                         </span>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {log.details ? JSON.stringify(log.details) : <span style={{ opacity: 0.5 }}>No context attached</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <PaginationControls
            currentPage={safePage}
            totalItems={logs.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            itemLabel="logs"
          />
      </div>
    </div>
  )
}
