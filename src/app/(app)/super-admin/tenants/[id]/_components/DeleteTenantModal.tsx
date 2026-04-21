'use client'

import { useState, useTransition, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { deleteTenantAction } from '@/actions/tenant'

interface DeleteTenantModalProps {
  tenantId: string
  tenantName: string
  isOpen: boolean
  onClose: () => void
}

export default function DeleteTenantModal({ tenantId, tenantName, isOpen, onClose }: DeleteTenantModalProps) {
  const [isPending, startTransition] = useTransition()
  const [confirmText, setConfirmText] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!isOpen) return null

  const isConfirmed = confirmText === tenantName

  if (!mounted) return null

  return createPortal(
    <>
      <div
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: '3rem 1rem', overflowY: 'auto',
        }}
      >
        <div style={{
          position: 'relative', margin: 'auto',
          width: '100%', maxWidth: 460,
          background: 'var(--bg-surface)',
          border: '1px solid rgba(244,63,94,0.3)',
          borderRadius: 20, padding: '2rem',
          boxShadow: '0 25px 80px rgba(244,63,94,0.2)',
        }}>
          {/* Close Button Top Pinned */}
          <button onClick={onClose} style={{
            position: 'absolute', top: '1.25rem', right: '1.25rem',
            width: 32, height: 32, borderRadius: 8, background: 'var(--bg-raised)',
            border: '1px solid var(--border)', color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: '1.125rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10,
          }}>✕</button>

          <div style={{ textAlign: 'center', marginBottom: '1.5rem', paddingRight: '1rem', paddingLeft: '1rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 1rem',
            background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.75rem',
          }}><span className="material-symbols-outlined" style={{fontSize: '1.2em', color: '#fca5a5'}}>delete</span></div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#fca5a5', margin: '0 0 0.5rem' }}>
            Delete Tenant
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
            This will permanently delete <strong style={{ color: 'var(--text-primary)' }}>{tenantName}</strong> and drop its entire TiDB database. This cannot be undone.
          </p>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
            Type <strong style={{ color: '#fca5a5' }}>{tenantName}</strong> to confirm
          </label>
          <input
            value={confirmText} onChange={e => setConfirmText(e.target.value)}
            placeholder={tenantName}
            style={{
              width: '100%', padding: '0.75rem 1rem', borderRadius: 10,
              background: 'var(--bg-raised)', border: `1px solid ${isConfirmed ? 'rgba(244,63,94,0.5)' : 'var(--border)'}`,
              color: 'var(--text-primary)', fontSize: '0.9375rem', outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '0.75rem', borderRadius: 10,
            background: 'var(--bg-raised)', border: '1px solid var(--border)',
            color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
          }}>Cancel</button>
          <button
            disabled={!isConfirmed || isPending}
            onClick={() => startTransition(() => deleteTenantAction(tenantId))}
            style={{
              flex: 1, padding: '0.75rem', borderRadius: 10,
              background: isConfirmed ? 'linear-gradient(135deg, #dc2626, #f43f5e)' : 'var(--bg-overlay)',
              border: 'none', color: isConfirmed ? '#fff' : 'var(--text-muted)',
              cursor: isConfirmed ? 'pointer' : 'not-allowed',
              fontWeight: 700, fontSize: '0.9rem', transition: 'all 200ms',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
          >{isPending ? <><span className="material-symbols-outlined">hourglass_empty</span> Deleting...</> : <><span className="material-symbols-outlined">delete_forever</span> Delete Forever</>}</button>
        </div>
        </div>
      </div>
    </>,
    document.body
  )
}
