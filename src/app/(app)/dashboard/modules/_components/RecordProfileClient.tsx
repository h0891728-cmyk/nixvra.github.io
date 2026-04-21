'use client'

import React, { useState } from 'react'
import AttendanceTracker from './AttendanceTracker'
import ProfileEditModal from './ProfileEditModal'
import Link from 'next/link'
import { formatCurrency } from '@/lib/format'

export default function RecordProfileClient({
  record,
  fields,
  attendanceLogs,
  timelineEvents,
  linkMatrix,
}: {
  record: any
  fields: any[]
  attendanceLogs: any[]
  timelineEvents: any[]
  linkMatrix?: any[]
}) {
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'ATTENDANCE'>('DETAILS')
  const [showEditProfile, setShowEditProfile] = useState(false)
  
  // Base Maps polymorphic
  let traitLabel = 'Designation'
  let amountLabel = 'Associated Amount'
  if (record.type === 'STUDENT') { traitLabel = 'Class / Division'; amountLabel = 'Term Fees' }
  if (record.type === 'PROPERTY') { traitLabel = 'Construct Type'; amountLabel = 'Sale/Rent Price' }
  if (record.type === 'TEACHER') { traitLabel = 'Qualification'; amountLabel = 'Base Salary' }
  if (record.type === 'STAFF') { traitLabel = 'Department'; amountLabel = 'Base Salary' }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '2rem', alignItems: 'start' }}>
      
      {/* COLUMN 1: IDENTITY LEDGER */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#00B077,#008E60)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 900, marginBottom: '1rem', boxShadow: '0 10px 25px rgba(0,176,119,0.4)' }}>
             {record.name.substring(0, 1).toUpperCase()}
            </div>
          <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.25rem', fontWeight: 900 }}>{record.name}</h1>
          <span style={{ fontSize: '0.6875rem', padding: '0.2rem 0.5rem', borderRadius: 4, background: 'rgba(0,176,119,0.1)', color: '#00B077', fontWeight: 800 }}>{record.type}</span>
          {record.contact && <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.5rem 0 0' }}>{record.contact}</p>}
        </div>
        
        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
             <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)' }}>fingerprint</span>
             <div>
                <p style={{ margin: 0, fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)' }}>System Trace ID</p>
                <span style={{ fontSize: '0.875rem', fontFamily: 'monospace', color: 'var(--text-primary)' }}>{record.publicId.split('-')[0]}</span>
             </div>
          </div>

          <p style={{ margin: '1.5rem 0 1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Portal Authorization</p>
          {record.userAuth ? (
             <div style={{ padding: '1rem', borderRadius: 12, background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', fontWeight: 800, marginBottom: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>verified_user</span> Active Link
                </div>
                <p style={{ margin: 0, fontSize: '0.8125rem' }}>Auth Role: <b>{record.userAuth.role}</b></p>
                <p style={{ margin: 0, fontSize: '0.8125rem' }}>Email: <b>{record.userAuth.email}</b></p>
             </div>
          ) : (
             <div style={{ padding: '1rem', borderRadius: 12, background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontWeight: 800, marginBottom: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>lock_outline</span> Unlinked
                </div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>This profile cannot independently log into the system.</p>
             </div>
          )}
        </div>
      </div>

      {/* COLUMN 2: DYNAMIC LOGIC HUB */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '2rem' }}>
         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  onClick={() => setActiveTab('DETAILS')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, margin: 0, fontSize: '1.25rem', fontWeight: 900, color: activeTab === 'DETAILS' ? 'var(--text-primary)' : 'var(--text-muted)' }}
                >
                  Core Overview
                </button>
                <button 
                  onClick={() => setActiveTab('ATTENDANCE')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, margin: 0, fontSize: '1.25rem', fontWeight: 900, color: activeTab === 'ATTENDANCE' ? 'var(--text-primary)' : 'var(--text-muted)' }}
                >
                  Attendance Registry
                </button>
              </div>
            </div>
            {activeTab === 'DETAILS' && (
               <button onClick={() => setShowEditProfile(true)} style={{ padding: '0.5rem 1rem', borderRadius: 8, background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>edit</span> Edit Profile
               </button>
            )}
         </div>

         {activeTab === 'DETAILS' ? (
            <div>
              {record.description && (
                 <div style={{ marginBottom: '2rem' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>Biography / Description</p>
                    <p style={{ margin: 0, fontSize: '0.9375rem', lineHeight: 1.5, color: 'var(--text-primary)' }}>{record.description}</p>
                  </div>
               )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem', padding: '1.5rem', background: 'var(--bg-raised)', borderRadius: 12, border: '1px solid var(--border)' }}>
                 <div>
                     <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>category</span> {traitLabel}
                     </span>
                     <span style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)' }}>{record.coreTrait || 'Not Specified'}</span>
                  </div>
                  <div>
                     <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>payments</span> {amountLabel}
                     </span>
                     <span style={{ fontSize: '1.125rem', fontWeight: 800, color: '#10b981' }}>{formatCurrency(record.coreValue, record.currency)}</span>
                  </div>
               </div>

              {fields.length > 0 && (
                 <div>
                   <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 1rem', paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>Dynamic Attributes</p>
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
                      {fields.map(f => (
                         <div key={f.fieldSchema.publicId}>
                            <p style={{ margin: '0 0 0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{f.fieldSchema.name}</p>
                            <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700 }}>
                               {f.fieldValue ? (f.fieldSchema.fieldType === 'DATE' ? new Date(f.fieldValue).toLocaleDateString() : f.fieldValue) : <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>Empty</span>}
                            </p>
                         </div>
                      ))}
                   </div>
                 </div>
              )}

              {(!record.description && !record.coreTrait && !record.coreValue && fields.length === 0) && (
                 <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    This profile is currently empty. Click 'Edit Profile' to populate data parameters.
                 </div>
              )}
           </div>
         ) : (
           <AttendanceTracker record={record} logs={attendanceLogs} />
         )}
        {/* The Matrix Connections */}
        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--bg-raised)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: 6, fontSize: '1rem', fontWeight: 800 }}>
             <span className="material-symbols-outlined" style={{ color: '#ec4899', fontSize: '1.25rem' }}>hub</span>
             Polymorphic Associations
          </h3>
          <p style={{ margin: '0 0 1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
             This relationship graph maps structural links between profiles (e.g. Patients â†” Doctors, Properties â†” Agents).
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {linkMatrix?.map(conn => (
                 <Link key={conn.id} href={`/dashboard/modules/${conn.publicId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0.5rem 0.75rem', borderRadius: 8, background: 'var(--bg-surface)', border: `1px solid ${conn.direction === 'INBOUND' ? '#ec4899' : '#14b8a6'}`, textDecoration: 'none', color: 'var(--text-primary)' }}>
                   <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: conn.direction === 'INBOUND' ? '#ec4899' : '#14b8a6' }}>
                      {conn.direction === 'INBOUND' ? 'arrow_downward' : 'arrow_upward'}
                   </span>
                   <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                         {conn.type.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700 }}>{conn.record.name}</span>
                    </div>
                 </Link>
              ))}
             {(!linkMatrix || linkMatrix.length === 0) && (
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem' }}>No associations map structurally connected.</span>
             )}
          </div>

          <RecordGraphLinker sourceId={record.publicId} />
        </div>

      </div>

      {/* COLUMN 3: TIMELINE / INTERACTIONS */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
         <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.125rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)' }}>history</span>
            Action Timeline
         </h3>

         <TimelineUploader publicId={record.publicId} />

         <div style={{ borderLeft: '2px solid var(--border)', marginLeft: '0.5rem', paddingLeft: '1.25rem', position: 'relative', marginTop: '2rem' }}>
            
            {timelineEvents?.map((evt: any) => (
               <div key={evt.id} style={{ position: 'relative', marginBottom: '1.5rem' }}>
                  <div style={{ position: 'absolute', left: '-1.65rem', top: 0, width: 12, height: 12, borderRadius: '50%', background: '#f59e0b', border: '2px solid var(--bg-surface)' }}></div>
                  <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 800 }}>{evt.title}</p>
                  {evt.description && <p style={{ margin: '0.25rem 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{evt.description}</p>}
                  
                  {evt.fileUrl && (
                    <a href={evt.fileUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: '0.5rem', padding: '0.25rem 0.75rem', borderRadius: 8, background: 'rgba(0,176,119,0.1)', color: '#00B077', textDecoration: 'none', fontSize: '0.75rem', fontWeight: 700 }}>
                       <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>{evt.fileMeta === 'IMAGE' ? 'image' : 'picture_as_pdf'}</span>
                       View Attached File
                    </a>
                  )}
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600 }}>{new Date(evt.createdAt).toLocaleString()}</p>
               </div>
            ))}

            {record.userAuth && (
              <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                 <div style={{ position: 'absolute', left: '-1.65rem', top: 0, width: 12, height: 12, borderRadius: '50%', background: '#00B077', border: '2px solid var(--bg-surface)' }}></div>
                 <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700 }}>Profile Authorized</p>
                 <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>System Binding</p>
              </div>
            )}
            <div style={{ position: 'relative' }}>
               <div style={{ position: 'absolute', left: '-1.65rem', top: 0, width: 12, height: 12, borderRadius: '50%', background: '#10b981', border: '2px solid var(--bg-surface)' }}></div>
               <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700 }}>Profile Engineered</p>
               <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Core Creation • {new Date(record.createdAt).toLocaleDateString()}</p>
            </div>
         </div>
      </div>

      {showEditProfile && <ProfileEditModal record={record} fields={fields} onClose={() => setShowEditProfile(false)} />}
    </div>
  )
}

function TimelineUploader({ publicId }: { publicId: string }) {
   const [open, setOpen] = React.useState(false)
   const [form, setForm] = React.useState({ title: '', description: '', fileUrl: '' })
   const [isPending, startTransition] = React.useTransition()

   const submit = async (e: any) => {
      e.preventDefault()
      startTransition(async () => {
         const { createTimelineEventAction } = await import('@/actions/tenant-timeline')
         await createTimelineEventAction(publicId, {
            title: form.title, 
            description: form.description, 
            fileUrl: form.fileUrl, 
            fileMeta: form.fileUrl.endsWith('.pdf') ? 'PDF' : (form.fileUrl ? 'IMAGE' : undefined)
         })
         setForm({ title: '', description: '', fileUrl: '' })
         setOpen(false)
      })
   }

   if (!open) {
      return (
         <button onClick={() => setOpen(true)} style={{ width: '100%', padding: '0.75rem', borderRadius: 10, border: '1px dashed var(--border)', background: 'var(--bg-raised)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 700, fontSize: '0.8125rem' }}>
            + Log New Timeline Event
         </button>
      )
   }

   return (
      <form onSubmit={submit} style={{ padding: '1rem', borderRadius: 10, background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
         <input placeholder="Event Title (e.g. Uploaded Exam, Contract Call)" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-surface)', outline: 'none', color: 'var(--text-primary)', marginBottom: 8, boxSizing: 'border-box', fontSize: '0.8125rem' }} />
         <textarea placeholder="Optional notes or details..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-surface)', outline: 'none', color: 'var(--text-primary)', marginBottom: 8, resize: 'none', boxSizing: 'border-box', fontSize: '0.8125rem' }} />
         <input placeholder="File URL (Simulated string for now)" value={form.fileUrl} onChange={e => setForm({...form, fileUrl: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-surface)', outline: 'none', color: '#00B077', marginBottom: 8, boxSizing: 'border-box', fontSize: '0.8125rem' }} />
         
         <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <button type="button" onClick={() => setOpen(false)} style={{ flex: 1, padding: '0.5rem', borderRadius: 6, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Cancel</button>
            <button type="submit" disabled={isPending} style={{ flex: 2, padding: '0.5rem', borderRadius: 6, background: '#00B077', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>{isPending ? 'Logging...' : 'Post Event'}</button>
         </div>
      </form>
   )
}

function RecordGraphLinker({ sourceId }: { sourceId: string }) {
   const [open, setOpen] = React.useState(false)
   const [type, setType] = React.useState('')
   const [targetId, setTargetId] = React.useState('')
   const [meta1Key, setMeta1Key] = React.useState('')
   const [meta1Val, setMeta1Val] = React.useState('')
   const [meta2Key, setMeta2Key] = React.useState('')
   const [meta2Val, setMeta2Val] = React.useState('')
   const [records, setRecords] = React.useState<any[]>([])
   const [isPending, startTransition] = React.useTransition()

   const loadRecords = async () => {
      setOpen(true)
      if (records.length === 0) {
         const { getTenantRecordsAction } = await import('@/actions/tenant-records')
         const list = await getTenantRecordsAction()
         setRecords(list.filter((e: any) => e.publicId !== sourceId))
      }
   }

   const submit = async (e: any) => {
      e.preventDefault()
      startTransition(async () => {
         const { linkRecordsAction } = await import('@/actions/tenant-relations')
         // Build metadata object from any filled key-value pairs
         const metadata: Record<string, string> = {}
         if (meta1Key.trim() && meta1Val.trim()) metadata[meta1Key.trim()] = meta1Val.trim()
         if (meta2Key.trim() && meta2Val.trim()) metadata[meta2Key.trim()] = meta2Val.trim()
         await linkRecordsAction(sourceId, targetId, type, sourceId, Object.keys(metadata).length > 0 ? metadata : undefined)
         setOpen(false)
         setType('')
         setTargetId('')
         setMeta1Key(''); setMeta1Val(''); setMeta2Key(''); setMeta2Val('')
      })
   }

   if (!open) {
      return (
         <button onClick={loadRecords} style={{ padding: '0.5rem 1rem', borderRadius: 8, border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}>
            + Create New Link
         </button>
      )
   }

   return (
      <form onSubmit={submit} style={{ padding: '1rem', borderRadius: 8, background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
         <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.75rem' }}>
            <input placeholder="Relation type (e.g. TEACHES_IN, ENROLLED_IN, GUARDIAN_OF)" value={type} onChange={e => setType(e.target.value)} required style={{ flex: 2, minWidth: 180, padding: '0.5rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--text-primary)', fontSize: '0.8125rem' }} />
            <select value={targetId} onChange={e => setTargetId(e.target.value)} required style={{ flex: 3, minWidth: 200, padding: '0.5rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--text-primary)', fontSize: '0.8125rem' }}>
               <option value="" disabled>Select Target Node...</option>
               {records.map(e => (
                  <option key={e.publicId} value={e.publicId}>{e.name} ({e.type})</option>
               ))}
            </select>
         </div>

         {/* Contextual Metadata Pairs — e.g. subject: Maths, grade: 10 */}
         <p style={{ margin: '0 0 0.5rem', fontSize: '0.6875rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Context Metadata (optional)</p>
         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <input placeholder="Key (e.g. subject)" value={meta1Key} onChange={e => setMeta1Key(e.target.value)} style={{ padding: '0.4rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--text-primary)', fontSize: '0.75rem' }} />
            <input placeholder="Value (e.g. Maths)" value={meta1Val} onChange={e => setMeta1Val(e.target.value)} style={{ padding: '0.4rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--text-primary)', fontSize: '0.75rem' }} />
            <input placeholder="Key (e.g. grade)" value={meta2Key} onChange={e => setMeta2Key(e.target.value)} style={{ padding: '0.4rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--text-primary)', fontSize: '0.75rem' }} />
            <input placeholder="Value (e.g. 10)" value={meta2Val} onChange={e => setMeta2Val(e.target.value)} style={{ padding: '0.4rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--text-primary)', fontSize: '0.75rem' }} />
         </div>

         <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" onClick={() => setOpen(false)} style={{ flex: 1, padding: '0.5rem', borderRadius: 6, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Cancel</button>
            <button type="submit" disabled={isPending || !targetId || !type} style={{ flex: 2, padding: '0.5rem', borderRadius: 6, background: '#10b981', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
               {isPending ? 'Linking...' : 'Map Link →'}
            </button>
         </div>
      </form>
   )
}
