'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { deleteTenantRecordAction } from '@/actions/tenant-records'
import AddRecordModal from './AddRecordModal'
import CsvImportWizard from './CsvImportWizard'

interface Tab { label: string; value: string }
interface WorkspaceProfileRow {
  id: bigint
  publicId: string
  name: string
  type: string
  contact?: string | null
  userAuth?: { publicId: string; email: string; role: string } | null
  createdAt: string
}

type ViewMode = 'LIST' | 'KANBAN' | 'GRAPH'

export default function TenantModulesClient({ records, industry, tenantName }: { records: WorkspaceProfileRow[], industry: string, tenantName: string }) {
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [filterType, setFilterType] = useState<string>('ALL')
  const [viewMode, setViewMode] = useState<ViewMode>('LIST')
  const [isPending, setIsPending] = useState(false)

  // CHAMELEON TABS: Dynamically map based on Industry
  const CHAMELEON_MAP = {
    EDUCATION: [{ label: 'Students', value: 'STUDENT' }, { label: 'Teachers', value: 'TEACHER' }, { label: 'Parents', value: 'PARENT' }, { label: 'Staff', value: 'STAFF' }],
    REAL_ESTATE: [{ label: 'Properties', value: 'PROPERTY' }, { label: 'Leads', value: 'LEAD' }, { label: 'Agents', value: 'AGENT' }, { label: 'Customers', value: 'CUSTOMER' }],
    HEALTHCARE: [{ label: 'Patients', value: 'PATIENT' }, { label: 'Doctors (Staff)', value: 'STAFF' }, { label: 'Vendors', value: 'VENDOR' }]
  }

  const activeTabs: Tab[] = (CHAMELEON_MAP as Record<string, Tab[]>)[industry] ?? [
    { label: 'Customers', value: 'CUSTOMER' }, { label: 'Leads', value: 'LEAD' }, { label: 'Staff', value: 'STAFF' }, { label: 'Vendors', value: 'VENDOR' }
  ]

  const filteredRecords = filterType === 'ALL' ? records : records.filter(e => e.type === filterType)

  const handleDelete = async (id: bigint) => {
    if (!confirm('Are you sure you want to permanently delete this profile and any attached login portal access?')) return
    setIsPending(true)
    await deleteTenantRecordAction(id)
    setIsPending(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.75rem', color: '#00B077' }}>account_tree</span>
            {industry === 'EDUCATION' ? 'Students & Staff CRM' : industry === 'REAL_ESTATE' ? 'Properties & Leads CRM' : 'Polymorphic CRM Dashboard'}
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
            Unified view of your operational backbone, capable of supporting multi-dimensional profile relations.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setShowImport(true)} style={{ padding: '0.625rem 1.25rem', borderRadius: 10, background: 'var(--bg-raised)', color: 'var(--text-primary)', border: '1px solid var(--border)', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: '#ec4899' }}>upload_file</span> Import
          </button>
          <button onClick={() => setShowAdd(true)} style={{ padding: '0.625rem 1.25rem', borderRadius: 10, background: 'linear-gradient(135deg,#00B077,#008E60)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>add</span> New Profile
          </button>
        </div>
      </div>

      {showImport ? (
        <CsvImportWizard onCheckList={() => setShowImport(false)} activeTabs={activeTabs} />
      ) : (
        <>
          {/* Controls Hook (Tabs + Views) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
              <button 
                onClick={() => setFilterType('ALL')}
                style={{ padding: '0.5rem 1rem', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer', background: filterType === 'ALL' ? '#00B077' : 'var(--bg-raised)', color: filterType === 'ALL' ? '#fff' : 'var(--text-secondary)' }}
              >
                Overview
              </button>
              {activeTabs.map((t: Tab) => (
                <button 
                  key={t.value}
                  onClick={() => setFilterType(t.value)}
                  style={{ padding: '0.5rem 1rem', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer', background: filterType === t.value ? '#00B077' : 'var(--bg-raised)', color: filterType === t.value ? '#fff' : 'var(--text-secondary)' }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <button onClick={() => setViewMode('LIST')} style={{ padding: '0.4rem 0.75rem', background: viewMode === 'LIST' ? 'var(--bg-overlay)' : 'transparent', border: 'none', color: viewMode === 'LIST' ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>list</span>
              </button>
              <div style={{ width: 1, background: 'var(--border)' }} />
              <button onClick={() => setViewMode('KANBAN')} style={{ padding: '0.4rem 0.75rem', background: viewMode === 'KANBAN' ? 'var(--bg-overlay)' : 'transparent', border: 'none', color: viewMode === 'KANBAN' ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>view_kanban</span>
              </button>
              <div style={{ width: 1, background: 'var(--border)' }} />
              <button onClick={() => setViewMode('GRAPH')} style={{ padding: '0.4rem 0.75rem', background: viewMode === 'GRAPH' ? 'var(--bg-overlay)' : 'transparent', border: 'none', color: viewMode === 'GRAPH' ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>hub</span>
              </button>
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', minHeight: 400 }}>
            {filteredRecords.length === 0 ? (
               <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>No records found in this category.</div>
             ) : viewMode === 'KANBAN' ? (
              // ── KANBAN VIEW ──
              <div style={{ display: 'flex', gap: '1rem', padding: '1.5rem', overflowX: 'auto', minHeight: 600 }}>
                {activeTabs.map(tab => (
                  <div key={tab.value} style={{ width: 320, flexShrink: 0, background: 'var(--bg-raised)', borderRadius: 12, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '1rem', borderBottom: '2px solid #00B077', fontWeight: 800 }}>{tab.label}</div>
                    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', flex: 1 }}>
                      {records.filter(e => e.type === tab.value).map(e => (
                        <div key={e.id.toString()} style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', cursor: 'grab' }}>
                          <p style={{ margin: '0 0 0.5rem', fontWeight: 800 }}>
                            <Link href={`/dashboard/modules/${e.publicId}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>{e.name}</Link>
                          </p>
                          {e.contact && <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{e.contact}</p>}
                          {e.userAuth ? (
                            <span style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: 4, background: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: 700 }}>Auth Active</span>
                          ) : (
                            <span style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: 4, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontWeight: 700 }}>Profile Only</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : viewMode === 'GRAPH' ? (
              // ── GRAPH VIEW PIPELINE ──
              <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: '#008E60', display: 'block', marginBottom: '1rem' }}>hub</span>
                <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>360° Relationship Graph</h3>
                <p>Advanced WebGL node view rendering multi-dimensional profile links (coming soon).</p>
              </div>
            ) : (
              // ── LIST VIEW ──
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-raised)' }}>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Public ID</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Profile Name</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Type</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Access</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map(e => (
                    <tr key={e.id.toString()} style={{ borderBottom: '1px dashed var(--border)' }}>
                      <td style={{ padding: '1rem', fontSize: '0.6875rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        {e.publicId.split('-')[0]}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <p style={{ margin: 0, fontWeight: 700 }}>
                          <Link href={`/dashboard/modules/${e.publicId}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                             {e.name}
                          </Link>
                        </p>
                        {e.contact && <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{e.contact}</p>}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ fontSize: '0.6875rem', padding: '0.2rem 0.5rem', borderRadius: 4, background: 'rgba(0,176,119,0.1)', color: '#00B077', fontWeight: 800 }}>
                          {e.type}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                         {e.userAuth ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>verified_user</span> User Portal Active
                            </div>
                         ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>lock_outline</span> Offline Row
                            </div>
                         )}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                           <button onClick={() => handleDelete(e.id)} disabled={isPending} title="Delete Profile" style={{ padding: '0.4rem 0.5rem', borderRadius: 6, background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: '#f43f5e', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
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
        </>
      )}

      {showAdd && <AddRecordModal industry={industry} categoryTabs={activeTabs} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
