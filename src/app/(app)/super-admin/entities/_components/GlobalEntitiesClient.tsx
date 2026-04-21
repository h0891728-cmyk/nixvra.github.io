'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { deleteGlobalEntityAction } from '@/actions/entity-admin'
import { impersonateEntityAction } from '@/actions/auth'
import PolymorphicEntityForm from '@/components/crm/PolymorphicEntityForm'
import PaginationControls from '@/components/ui/PaginationControls'

interface EntityDisplay {
  id: string
  publicId: string
  type: string
  name: string
  contact: string | null
  createdAt: string
  tenantId: string
  tenantName: string
  tenantDb: string
}

const ENTITY_EMOJIS: Record<string, string> = {
  STUDENT: '🎓', PATIENT: '🏥', LEAD: '🎯', 
  AGENT: '🕵️', CUSTOMER: '🛍️', VENDOR: '🤝'
}

export default function GlobalEntitiesClient({ entities: initialEntities }: { entities: EntityDisplay[] }) {
  const [entities, setEntities] = useState(initialEntities)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [showForm, setShowForm] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 12

  const filtered = useMemo(() => entities.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase()) || 
      e.tenantName.toLowerCase().includes(search.toLowerCase()) ||
      (e.contact && e.contact.toLowerCase().includes(search.toLowerCase()))
    
    const matchesType = typeFilter === 'ALL' || e.type === typeFilter;
    
    return matchesSearch && matchesType;
  }), [entities, search, typeFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, typeFilter, entities.length])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedEntities = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  async function handleDelete(e: EntityDisplay) {
    if(!confirm(`Delete entity "${e.name}" permanently from tenant ${e.tenantName}?`)) return
    
    setEntities(prev => prev.filter(x => x.id !== e.id))
    try {
      await deleteGlobalEntityAction(e.tenantDb, e.id)
    } catch(err) {
      alert('Failed to delete entity')
      setEntities(initialEntities) // revert
    }
  }

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16 }}>
      
      {/* Table Header & Search */}
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input 
          placeholder="Search entities by name, contact, or tenant..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 250, padding: '0.625rem 1rem', borderRadius: 10,
            background: 'var(--bg-raised)', border: '1px solid var(--border)',
            color: 'var(--text-primary)', fontSize: '0.9375rem', outline: 'none',
          }}
        />
        <select
          value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          style={{ padding: '0.625rem 1rem', borderRadius: 10, background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
        >
          <option value="ALL">All Entity Types</option>
          {Object.keys(ENTITY_EMOJIS).map(t => <option key={t} value={t}>{ENTITY_EMOJIS[t]} {t}</option>)}
        </select>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '0.625rem 1rem', borderRadius: 10, border: 'none', background: showForm ? 'var(--bg-raised)' : '#00B077', 
            color: showForm ? 'var(--text-primary)' : '#fff', fontWeight: 700, cursor: 'pointer', transition: 'all 200ms'
          }}
        >
          {showForm ? 'Cancel Creation' : '+ Create Entity'}
        </button>
      </div>

      {showForm && (
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
          <PolymorphicEntityForm isGlobalAdmin={true} onSuccess={() => setShowForm(false)} />
        </div>
      )}

      {/* Table Content */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem', opacity: 0.5 }}>
             <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          <p>No entities found</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Entity Information</th>
                <th style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tenant Network</th>
                <th style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</th>
                <th style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Created</th>
                <th style={{ padding: '0.875rem 1.25rem', textAlign: 'right', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedEntities.map((e, i) => (
                <tr key={e.id} style={{ borderBottom: i < paginatedEntities.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  
                  <td style={{ padding: '0.875rem 1.25rem' }}>
                    <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', margin: 0 }}>{e.name}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.125rem 0 0' }}>{e.contact || 'No contact provided'}</p>
                  </td>

                  <td style={{ padding: '0.875rem 1.25rem' }}>
                    <Link href={`/super-admin/tenants/${e.tenantId}`} style={{ textDecoration: 'none' }}>
                      <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#06b6d4', margin: 0 }}>{e.tenantName}</p>
                      <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: 0, fontFamily: 'monospace' }}>{e.tenantDb}</p>
                    </Link>
                  </td>

                  <td style={{ padding: '0.875rem 1.25rem' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                      padding: '0.25rem 0.625rem', borderRadius: 999,
                      background: 'rgba(0,176,119,0.1)', border: '1px solid rgba(0,176,119,0.2)',
                      color: '#818cf8', fontSize: '0.75rem', fontWeight: 700,
                    }}>
                      {e.type}
                    </span>
                  </td>

                  <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    {new Date(e.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>

                  <td style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button 
                        onClick={() => {
                          if(confirm(`Ghost login as entity "${e.name}"?`)) {
                             impersonateEntityAction(e.tenantId, e.id)
                          }
                        }}
                        title="Ghost Login as Entity"
                        style={{
                          padding: '0.375rem 0.75rem', borderRadius: 8,
                          background: 'rgba(0,176,119,0.1)', border: '1px solid rgba(0,176,119,0.2)',
                          color: '#00B077', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '0.25rem'
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>bolt</span>
                        Ghost
                      </button>

                      <button 
                        onClick={() => handleDelete(e)}
                        style={{
                          padding: '0.375rem 0.75rem', borderRadius: 8,
                          background: 'transparent', border: '1px solid var(--border)',
                          color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <PaginationControls
        currentPage={safePage}
        totalItems={filtered.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        itemLabel="entities"
      />
    </div>
  )
}
