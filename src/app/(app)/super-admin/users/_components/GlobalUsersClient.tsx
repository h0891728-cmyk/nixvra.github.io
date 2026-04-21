'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { deleteGlobalUserAction, updateGlobalUserRoleAction } from '@/actions/user-admin'
import PaginationControls from '@/components/ui/PaginationControls'

interface UserDisplay {
  id: string
  publicId: string
  email: string
  role: string
  createdAt: string
  tenantId: string
  tenantName: string
  tenantDb: string
}

export default function GlobalUsersClient({ users: initialUsers }: { users: UserDisplay[] }) {
  const [users, setUsers] = useState(initialUsers)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 12

  const filtered = useMemo(() => users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.tenantName.toLowerCase().includes(search.toLowerCase())
  ), [users, search])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, users.length])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedUsers = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  async function handleRoleChange(u: UserDisplay, newRole: string) {
    if(!confirm(`Change role to ${newRole}?`)) return
    
    // Optimistic update
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: newRole } : x))
    
    try {
      await updateGlobalUserRoleAction(u.tenantDb, u.id, newRole)
    } catch(err) {
      alert('Failed to change role')
      setUsers(initialUsers) // revert
    }
  }

  async function handleDelete(u: UserDisplay) {
    if(!confirm(`Delete user ${u.email} permanently from tenant ${u.tenantName}?`)) return
    
    setUsers(prev => prev.filter(x => x.id !== u.id))
    try {
      await deleteGlobalUserAction(u.tenantDb, u.id)
    } catch(err) {
      alert('Failed to delete user')
      setUsers(initialUsers) // revert
    }
  }

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16 }}>
      
      {/* Table Header & Search */}
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input 
          placeholder="Search users by email or tenant..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 250, padding: '0.625rem 1rem', borderRadius: 10,
            background: 'var(--bg-raised)', border: '1px solid var(--border)',
            color: 'var(--text-primary)', fontSize: '0.9375rem', outline: 'none',
          }}
        />
      </div>

      {/* Table Content */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem', opacity: 0.5 }}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <p>No users found</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User Email</th>
                <th style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tenant Network</th>
                <th style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</th>
                <th style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Joined</th>
                <th style={{ padding: '0.875rem 1.25rem', textAlign: 'right', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: i < paginatedUsers.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  
                  <td style={{ padding: '0.875rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                        background: 'rgba(0,176,119,0.1)', border: '1px solid rgba(0,176,119,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.875rem', fontWeight: 700, color: '#818cf8',
                      }}>
                        {u.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', margin: 0 }}>{u.email}</p>
                        <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: 0, fontFamily: 'monospace' }}>{u.publicId}</p>
                      </div>
                    </div>
                  </td>

                  <td style={{ padding: '0.875rem 1.25rem' }}>
                    <Link href={`/super-admin/tenants/${u.tenantId}`} style={{ textDecoration: 'none' }}>
                      <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#06b6d4', margin: 0 }}>{u.tenantName}</p>
                      <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: 0, fontFamily: 'monospace' }}>{u.tenantDb}</p>
                    </Link>
                  </td>

                  <td style={{ padding: '0.875rem 1.25rem' }}>
                    <select 
                      value={u.role}
                      onChange={(e) => handleRoleChange(u, e.target.value)}
                      style={{
                        padding: '0.375rem 0.5rem', borderRadius: 6,
                        background: u.role === 'SUPER_ADMIN' ? 'rgba(244,63,94,0.1)' : u.role === 'TENANT_ADMIN' ? 'rgba(0,142,96,0.1)' : 'rgba(0,176,119,0.1)',
                        border: '1px solid transparent',
                        color: u.role === 'SUPER_ADMIN' ? '#f43f5e' : u.role === 'TENANT_ADMIN' ? '#008E60' : '#818cf8',
                        fontSize: '0.75rem', fontWeight: 700, outline: 'none', cursor: 'pointer',
                      }}
                    >
                      <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                      <option value="TENANT_ADMIN">TENANT_ADMIN</option>
                      <option value="STAFF">STAFF</option>
                      <option value="CUSTOMER">CUSTOMER</option>
                    </select>
                  </td>

                  <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>

                  <td style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>
                    <button 
                      onClick={() => handleDelete(u)}
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
        itemLabel="users"
      />
    </div>
  )
}
