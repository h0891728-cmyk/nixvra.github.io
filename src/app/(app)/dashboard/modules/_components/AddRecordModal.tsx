'use client'

import React, { useState, useTransition, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createTenantRecordAction } from '@/actions/tenant-records'

type AddRecordModalProps = {
  industry: string
  categoryTabs: { label: string, value: string }[]
  onClose: () => void
}

export default function AddRecordModal({ industry, categoryTabs, onClose }: AddRecordModalProps) {
  const [mounted, setMounted] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  // Form State
  const [selectedType, setSelectedType] = useState(categoryTabs[0]?.value || 'CUSTOMER')
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [createAuth, setCreateAuth] = useState(false)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')

  useEffect(() => { setMounted(true) }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (createAuth && (!authEmail || !authPassword)) {
       setError('Email and Password are required to create portal access.')
       return
    }

    const formData = new FormData()
    formData.append('type', selectedType)
    formData.append('name', name)
    formData.append('contact', contact)
    formData.append('createAuth', createAuth ? 'true' : 'false')
    formData.append('authEmail', authEmail)
    formData.append('authPassword', authPassword)

    startTransition(async () => {
      try {
        await createTenantRecordAction(formData)
        window.location.reload()
        onClose()
      } catch (err: any) {
        setError(err.message || 'Operation failed')
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
      borderRadius: 20, width: '100%', maxWidth: 500,
      display: 'flex', flexDirection: 'column' as const,
      overflow: 'hidden', boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
    },
    header: { padding: '1.5rem 1.5rem 0', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' },
    body: { padding: '1.5rem', maxHeight: '75vh', overflowY: 'auto' as const },
    input: {
      width: '100%', padding: '0.75rem 1rem', borderRadius: 10,
      background: 'var(--bg-raised)', border: '1px solid var(--border)',
      color: 'var(--text-primary)', fontSize: '0.9375rem', outline: 'none', boxSizing: 'border-box' as const,
    },
    select: {
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
        <button onClick={onClose} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', width: 32, height: 32, borderRadius: 8, background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.125rem' }}>✕</button>

        <div style={s.header}>
          <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)' }}>Register New Profile</h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Map a profile directly into the CRM core.</p>
        </div>

        <form onSubmit={handleSubmit} style={s.body}>
          {error && <div style={{ marginBottom: '1.25rem', padding: '0.75rem', borderRadius: 10, background: 'rgba(244,63,94,0.1)', color: '#f43f5e', fontSize: '0.8125rem', fontWeight: 600 }}>{error}</div>}

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={s.label}>Category</label>
            <select value={selectedType} onChange={e => setSelectedType(e.target.value)} style={s.select}>
               {categoryTabs.map(t => (
                 <option key={t.value} value={t.value}>{t.label}</option>
               ))}
            </select>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={s.label}>Full Name / Title</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Doe, or Property 1A" required style={s.input} />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={s.label}>Primary Contact (Optional)</label>
            <input value={contact} onChange={e => setContact(e.target.value)} placeholder="Phone or email contact" style={s.input} />
          </div>

          <div style={{ padding: '1rem', borderRadius: 12, border: '1px solid var(--border)', background: createAuth ? 'rgba(0,176,119,0.05)' : 'var(--bg-raised)', marginBottom: '1.5rem' }}>
             <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
               <input type="checkbox" checked={createAuth} onChange={e => setCreateAuth(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#00B077' }} />
               <div>
                 <span style={{ display: 'block', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>Enable Login Portal Access</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Provisions an isolated platform login for this profile.</span>
               </div>
             </label>

             {createAuth && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                   <div style={{ marginBottom: '1rem' }}>
                     <label style={s.label}>Login Email</label>
                     <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="john@example.com" required={createAuth} style={s.input} />
                   </div>
                   <div>
                     <label style={s.label}>Initial Password</label>
                     <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="••••••••" required={createAuth} style={s.input} />
                   </div>
                </div>
             )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
             <button type="button" onClick={onClose} style={{ ...s.btn('ghost'), flex: 1 }}>Cancel</button>
           <button type="submit" disabled={isPending} style={{ ...s.btn('primary'), flex: 2 }}>{isPending ? 'Saving...' : 'Register Profile'}</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
