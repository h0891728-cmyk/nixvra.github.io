'use client'

import React, { useState, useTransition, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { updateRecordCoreAction } from '@/actions/tenant-core-profile'
import { saveCustomValuesAction } from '@/actions/tenant-profile'

export default function ProfileEditModal({ record, fields, onClose }: { record: any, fields: any[], onClose: () => void }) {
  const [mounted, setMounted] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  // Base Maps polymorphic
  let traitLabel = 'Designation'
  let amountLabel = 'Associated Amount'
  if (record.type === 'STUDENT') { traitLabel = 'Student Class / Division'; amountLabel = 'Term Fees' }
  if (record.type === 'PROPERTY') { traitLabel = 'Property Type (e.g. Duplex)'; amountLabel = 'Sale Price' }
  if (record.type === 'TEACHER') { traitLabel = 'Qualification'; amountLabel = 'Salary' }
  if (record.type === 'STAFF') { traitLabel = 'Department'; amountLabel = 'Salary' }

  const [coreForm, setCoreForm] = useState({
     name: record.name || '',
     contact: record.contact || '',
     description: record.description || '',
     coreTrait: record.coreTrait || '',
     coreValue: record.coreValue ? record.coreValue.toString() : ''
  })

  // Dynamic Custom Forms
  const [cfForm, setCfForm] = useState<Record<string, string>>(() => {
     const init: Record<string, string> = {}
     fields.forEach(f => { init[f.fieldSchema.publicId] = f.fieldValue || '' })
     return init
  })

  useEffect(() => setMounted(true), [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
     startTransition(async () => {
        try {
           await updateRecordCoreAction(record.publicId, coreForm)
           
           if (fields.length > 0) {
             const mappedEntries = Object.keys(cfForm).map(key => ({ fieldId: key, value: cfForm[key] }))
             await saveCustomValuesAction(record.publicId, mappedEntries)
           }

          window.location.reload()
       } catch (err) {
          console.error(err)
       }
    })
  }

  const s = {
    overlay: {
      position: 'fixed' as const, inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    },
    modal: {
      position: 'relative' as const, margin: 'auto',
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 20, width: '100%', maxWidth: 650, maxHeight: '90vh',
      display: 'flex', flexDirection: 'column' as const,
      overflow: 'hidden', boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
    },
    header: { padding: '1.5rem 1.5rem 0', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' },
    body: { padding: '1.5rem', overflowY: 'auto' as const },
    input: {
      width: '100%', padding: '0.75rem 1rem', borderRadius: 10,
      background: 'var(--bg-raised)', border: '1px solid var(--border)',
      color: 'var(--text-primary)', fontSize: '0.9375rem', outline: 'none', boxSizing: 'border-box' as const,
    },
    label: { display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' },
    btn: (variant: 'primary' | 'ghost') => ({
      padding: '0.625rem 1.25rem', borderRadius: 10, fontWeight: 700,
      fontSize: '0.875rem', cursor: 'pointer', border: 'none',
      ...(variant === 'primary' ? { background: 'linear-gradient(135deg,#00B077,#008E60)', color: '#fff' } : {}),
      ...(variant === 'ghost' ? { background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-muted)' } : {}),
    }),
  }

  if (!mounted) return null

  return createPortal(
    <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
       <div style={s.modal}>
          <div style={s.header}>
             <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>Edit Profile Data</h2>
             <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Fill in universal bounds and custom fields.</p>
          </div>

          <form onSubmit={handleSubmit} style={s.body}>
             {/* BASE FIELDS */}
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={s.label}>Full Name</label>
                  <input value={coreForm.name} onChange={e => setCoreForm({...coreForm, name: e.target.value})} required style={s.input} />
                </div>
                <div>
                  <label style={s.label}>Primary Contact</label>
                  <input value={coreForm.contact} onChange={e => setCoreForm({...coreForm, contact: e.target.value})} style={s.input} />
                </div>
             </div>

             <div style={{ marginBottom: '1rem' }}>
                <label style={s.label}>Overarching Description</label>
                <textarea rows={3} value={coreForm.description} onChange={e => setCoreForm({...coreForm, description: e.target.value})} style={{ ...s.input, resize: 'none' }} placeholder="Enter notes or descriptive summaries here..." />
             </div>

             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                  <label style={s.label}>{traitLabel}</label>
                  <input value={coreForm.coreTrait} onChange={e => setCoreForm({...coreForm, coreTrait: e.target.value})} placeholder={`E.g. Grade 10 / B.Tech`} style={s.input} />
                </div>
                <div>
                  <label style={s.label}>{amountLabel}</label>
                  <div style={{ position: 'relative' }}>
                     <span style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }}>$</span>
                     <input type="number" step="0.01" value={coreForm.coreValue} onChange={e => setCoreForm({...coreForm, coreValue: e.target.value})} style={{ ...s.input, paddingLeft: 28 }} />
                  </div>
                </div>
             </div>

             {/* DYNAMIC FIELDS (Super Admin Provisioned) */}
             {fields.length > 0 && (
                <>
                   <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 800, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>Dynamic Attributes</h3>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                      {fields.map(f => (
                         <div key={f.fieldSchema.publicId}>
                            <label style={s.label}>
                               {f.fieldSchema.name} {f.fieldSchema.isRequired && <span style={{ color: '#f43f5e' }}>*</span>}
                            </label>
                            {f.fieldSchema.fieldType === 'TEXT' && <input value={cfForm[f.fieldSchema.publicId]} onChange={e => setCfForm({...cfForm, [f.fieldSchema.publicId]: e.target.value})} style={s.input} required={f.fieldSchema.isRequired} />}
                            {f.fieldSchema.fieldType === 'NUMBER' && <input type="number" value={cfForm[f.fieldSchema.publicId]} onChange={e => setCfForm({...cfForm, [f.fieldSchema.publicId]: e.target.value})} style={s.input} required={f.fieldSchema.isRequired} />}
                            {f.fieldSchema.fieldType === 'DATE' && <input type="date" value={cfForm[f.fieldSchema.publicId]} onChange={e => setCfForm({...cfForm, [f.fieldSchema.publicId]: e.target.value})} style={s.input} required={f.fieldSchema.isRequired} />}
                            {f.fieldSchema.fieldType === 'SELECT' && (
                                <select value={cfForm[f.fieldSchema.publicId]} onChange={e => setCfForm({...cfForm, [f.fieldSchema.publicId]: e.target.value})} style={s.input} required={f.fieldSchema.isRequired}>
                                   <option value="">-- Choose Option --</option>
                                   {(f.fieldSchema.options || ['Option A', 'Option B']).map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            )}
                         </div>
                      ))}
                   </div>
                </>
             )}

             <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" onClick={onClose} style={{ ...s.btn('ghost'), flex: 1 }}>Cancel</button>
                <button type="submit" disabled={isPending} style={{ ...s.btn('primary'), flex: 2 }}>{isPending ? 'Syncing...' : 'Save Profile Changes'}</button>
             </div>
          </form>
       </div>
    </div>,
    document.body
  )
}
