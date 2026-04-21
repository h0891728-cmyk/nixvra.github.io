'use client'

import { useState } from 'react'
import AddDomainModal from './AddDomainModal'
import { GlobeIcon } from '@/components/icons'

interface DomainPageHeaderProps {
  tenants: { id: string; name: string; subdomain: string }[]
}

export default function DomainPageHeader({ tenants }: DomainPageHeaderProps) {
  const [showModal, setShowModal] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  function handleSuccess(msg: string) {
    setSuccessMsg(msg)
    setShowModal(false)
    setTimeout(() => setSuccessMsg(null), 6000)
  }

  return (
    <>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <GlobeIcon style={{ width: 18, height: 18, color: '#00B077' }} />
            Domain Management
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
            Approve external domains or purchase new ones from Name.com with auto-DNS
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: '0.625rem 1.25rem', borderRadius: 10,
            background: 'linear-gradient(135deg, #00B077, #008E60)',
            border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.875rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}
        >
          + Add Domain
        </button>
      </div>

      {/* Success toast */}
      {successMsg && (
        <div style={{
          marginTop: '1rem', padding: '0.875rem 1.25rem', borderRadius: 12,
          background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
          fontSize: '0.875rem', fontWeight: 600, color: '#10b981',
          animation: 'fadeIn 200ms ease',
        }}>
          ✅ {successMsg}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <AddDomainModal
          tenants={tenants}
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  )
}
