'use client'

import React, { useState, useTransition } from 'react'
import { createTenantSchemaFieldAction } from '@/actions/super-admin-schema'

export default function SchemaManagerClient({ tenantId, tenantIndustry, initialFields }: { tenantId: string, tenantIndustry: string, initialFields: any[] }) {
  const [isPending, startTransition] = useTransition()
  const [showAdd, setShowAdd] = useState(false)

  const [form, setForm] = useState({
     name: '',
     entityType: 'CUSTOMER',
     fieldType: 'TEXT',
     isRequired: false,
     options: ''
  })

  // Map contextual entity types
  const mappedTypes = {
    'EDUCATION': ['STUDENT', 'TEACHER', 'PARENT', 'STAFF'],
    'REAL_ESTATE': ['PROPERTY', 'AGENT', 'LEAD', 'STAFF'],
    'HEALTHCARE': ['PATIENT', 'STAFF', 'VENDOR']
  }[tenantIndustry] || ['CUSTOMER', 'STAFF']

  const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault()
     startTransition(async () => {
        try {
           const parsedOptions = form.fieldType === 'SELECT' ? form.options.split(',').map(o => o.trim()).filter(Boolean) : []
           await createTenantSchemaFieldAction(tenantId, {
             name: form.name,
             entityType: form.entityType,
             fieldType: form.fieldType,
             isRequired: form.isRequired,
             options: parsedOptions.length > 0 ? parsedOptions : undefined
           })
           setShowAdd(false)
           setForm({ name: '', entityType: mappedTypes[0], fieldType: 'TEXT', isRequired: false, options: '' })
        } catch (err) {
           console.error(err)
        }
     })
  }

  const s = {
     input: { width: '100%', padding: '0.75rem 1rem', borderRadius: 10, background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '1rem' },
     label: { display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' },
     btn: (primary: boolean) => ({ padding: '0.75rem 1.5rem', borderRadius: 10, fontWeight: 800, cursor: 'pointer', border: 'none', ...(primary ? { background: '#00B077', color: '#fff' } : { background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }) })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '2rem', alignItems: 'start' }}>
       
       <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 900 }}>Active Tenant Custom Fields</h2>
             <button onClick={() => setShowAdd(!showAdd)} style={s.btn(false)}>
                {showAdd ? 'Close Builder' : '+ Construct Field'}
             </button>
          </div>
          
          <div style={{ padding: '1.5rem' }}>
             {showAdd && (
                <form onSubmit={handleSubmit} style={{ padding: '2rem', background: 'var(--bg-raised)', border: '1px dashed var(--border)', borderRadius: 16, marginBottom: '2rem' }}>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                         <label style={s.label}>Field Name (e.g. Blood Type, Block Number)</label>
                         <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required style={s.input} />
                      </div>
                      <div>
                         <label style={s.label}>Target Entity Scope</label>
                         <select value={form.entityType} onChange={e => setForm({...form, entityType: e.target.value})} required style={s.input}>
                            {mappedTypes.map(type => <option key={type} value={type}>{type}</option>)}
                         </select>
                      </div>
                      <div>
                         <label style={s.label}>Data Type</label>
                         <select value={form.fieldType} onChange={e => setForm({...form, fieldType: e.target.value})} required style={s.input}>
                            <option value="TEXT">Short Text</option>
                            <option value="NUMBER">Number Variant</option>
                            <option value="DATE">Date Selector</option>
                            <option value="SELECT">Dropdown Menu</option>
                         </select>
                      </div>
                      <div>
                         <label style={s.label}>Validation Rules</label>
                         <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, cursor: 'pointer', fontSize: '0.875rem' }}>
                            <input type="checkbox" checked={form.isRequired} onChange={e => setForm({...form, isRequired: e.target.checked})} />
                            Field Cannot Be Empty (Required)
                         </label>
                      </div>
                   </div>

                   {form.fieldType === 'SELECT' && (
                      <div style={{ marginTop: '1rem' }}>
                         <label style={s.label}>Dropdown Comma-Separated Options</label>
                         <input value={form.options} onChange={e => setForm({...form, options: e.target.value})} placeholder="e.g. A+, B-, O+, AB+" required style={s.input} />
                      </div>
                   )}

                   <div style={{ marginTop: '1.5rem' }}>
                      <button type="submit" disabled={isPending} style={s.btn(true)}>
                         {isPending ? 'Propagating into Tenant Database...' : 'Deploy Database Field'}
                      </button>
                   </div>
                </form>
             )}

             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                {initialFields.length === 0 ? (
                   <div style={{ gridColumn: 'span 3', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No Custom Fields constructed for this tenant yet.</div>
                ) : initialFields.map(f => (
                   <div key={f.publicId} style={{ padding: '1.5rem', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 12 }}>
                      <span style={{ fontSize: '0.625rem', fontWeight: 800, color: '#f59e0b', padding: '0.1rem 0.4rem', border: '1px solid currentColor', borderRadius: 4, textTransform: 'uppercase' }}>{f.entityType}</span>
                      <h3 style={{ margin: '0.5rem 0', fontSize: '1rem', fontWeight: 800 }}>{f.name}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                         Type: <b style={{ color: 'var(--text-primary)' }}>{f.fieldType}</b> • Req: <b style={{ color: 'var(--text-primary)' }}>{f.isRequired ? 'Yes' : 'No'}</b>
                      </div>
                      <p style={{ margin: '0.5rem 0 0', fontSize: '0.6875rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>DB ID: {f.publicId.split('-')[0]}</p>
                   </div>
                ))}
             </div>
          </div>
       </div>

       <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 800 }}>Schema Engine Map</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
             By provisioning custom fields here in the Super Admin interface, you safely update the tenant's isolated database structure without requiring them to construct their own polymorphic logic.
          </p>
          <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: 8, background: 'rgba(0,176,119,0.1)', color: '#00B077', fontSize: '0.75rem', fontWeight: 700 }}>
             These fields are exclusively tied to <b>{tenantIndustry}</b> categories.
          </div>
       </div>

    </div>
  )
}
