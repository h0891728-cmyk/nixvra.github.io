'use client'

import { useState } from 'react'
import EditTenantModal from './EditTenantModal'
import DeleteTenantModal from './DeleteTenantModal'

interface TenantActionsBarProps {
  tenant: {
    id: string
    name: string
    industry: string
    modules: unknown
    plan: string
    planStatus: string
    planAmount: number
    billingCycle: string
    planExpiryDate: string | null
  }
}

export default function TenantActionsBar({ tenant }: TenantActionsBarProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <div style={{ display: 'flex', gap: '0.625rem' }}>
        <button
          id="btn-edit-tenant"
          onClick={() => setEditOpen(true)}
          style={{
            padding: '0.5rem 1.25rem', borderRadius: 10,
            background: 'var(--bg-raised)', border: '1px solid var(--border)',
            color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
            display: 'flex', alignItems: 'center', gap: '0.375rem',
          }}
        >
          ✏️ Edit
        </button>
        <button
          id="btn-delete-tenant"
          onClick={() => setDeleteOpen(true)}
          style={{
            padding: '0.5rem 1.25rem', borderRadius: 10,
            background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)',
            color: '#f43f5e', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
            display: 'flex', alignItems: 'center', gap: '0.375rem',
          }}
        >
          🗑️ Delete
        </button>
      </div>

      <EditTenantModal tenant={tenant} isOpen={editOpen} onClose={() => setEditOpen(false)} />
      <DeleteTenantModal
        tenantId={tenant.id}
        tenantName={tenant.name}
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
      />
    </>
  )
}
