'use client'

import React, { useState } from 'react'
import { removeDomainAction, verifyDomainDnsAction, setPrimaryDomainAction } from '@/actions/domain'
import TenantAddDomainModal from './TenantAddDomainModal'

export default function TenantDomainsClient({ domains, tenantId }: { domains: any[], tenantId: string }) {
  const [showAdd, setShowAdd] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleVerify = async (id: string) => {
    setLoadingId(`verify-${id}`)
    await verifyDomainDnsAction(id)
    setLoadingId(null)
  }

  const handleMakePrimary = async (id: string) => {
    setLoadingId(`primary-${id}`)
    await setPrimaryDomainAction(id, tenantId)
    setLoadingId(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to completely delete this domain mapping?')) return
    setLoadingId(`delete-${id}`)
    await removeDomainAction(id, tenantId)
    setLoadingId(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.75rem', color: '#10b981' }}>public</span>
            Workspace Domain Manager
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
            Connect custom domains or seamlessly purchase them securely.
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ padding: '0.625rem 1.25rem', borderRadius: 10, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>add</span> Add Domain
        </button>
      </div>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        {domains.length === 0 ? (
           <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>You have no domains attached to your workspace.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-raised)' }}>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Domain</th>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {domains.map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1.25rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{d.domain}</span>
                      {d.type === 'PRIMARY' && <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem', borderRadius: 4, background: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: 800, textTransform: 'uppercase' }}>Primary</span>}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: 6, fontWeight: 700, 
                       background: d.status === 'ACTIVE' ? 'rgba(16,185,129,0.1)' : d.status === 'PENDING_APPROVAL' ? 'rgba(245,158,11,0.1)' : 'rgba(244,63,94,0.1)',
                       color: d.status === 'ACTIVE' ? '#10b981' : d.status === 'PENDING_APPROVAL' ? '#f59e0b' : '#f43f5e'
                    }}>
                      {d.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                       {d.status !== 'ACTIVE' && (
                         <button onClick={() => handleVerify(d.id)} disabled={loadingId === `verify-${d.id}`} style={{ padding: '0.4rem 0.75rem', borderRadius: 6, background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                           {loadingId === `verify-${d.id}` ? 'Checking...' : 'Check DNS'}
                         </button>
                       )}
                       {d.status === 'ACTIVE' && d.type !== 'PRIMARY' && (
                         <button onClick={() => handleMakePrimary(d.id)} disabled={loadingId === `primary-${d.id}`} style={{ padding: '0.4rem 0.75rem', borderRadius: 6, background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                           Make Primary
                         </button>
                       )}
                       <button onClick={() => handleDelete(d.id)} disabled={loadingId === `delete-${d.id}`} style={{ padding: '0.4rem 0.5rem', borderRadius: 6, background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: '#f43f5e', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                         <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>delete</span>
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      {showAdd && <TenantAddDomainModal tenantId={tenantId} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
