'use client'

import React, { useState } from 'react'
import { createTenantInvoice } from '@/actions/payroll'

type Props = {
  tenantId: string
  entities: { id: string, name: string }[]
  onSuccess?: () => void
}

export default function InvoiceCreator({ tenantId, entities, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState('')
  const [tax, setTax] = useState('')
  const [entityId, setEntityId] = useState('')
  const [date, setDate] = useState('')

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    if (!entityId || !amount) return
    setLoading(true)
    try {
      await createTenantInvoice(tenantId, {
        businessEntityId: entityId,
        amount: parseFloat(amount),
        taxAmount: tax ? parseFloat(tax) : 0,
        dueDate: date || undefined
      })
      setAmount('')
      setTax('')
      setDate('')
      onSuccess?.()
    } catch (_) {}
    setLoading(false)
  }

  return (
    <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 16, border: '1px solid var(--border)' }}>
      <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="material-symbols-outlined" style={{ color: '#008E60' }}>receipt_long</span>
        Create Custom Invoice
      </h3>
      
      <form onSubmit={handlePost} style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bill To (Business Entity)</label>
          <select value={entityId} onChange={e => setEntityId(e.target.value)} required className="form-input" style={{ marginTop: 4 }}>
            <option value="">Select Entity...</option>
            {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Base Amount</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="Ex: 5000" className="form-input" style={{ marginTop: 4 }} />
        </div>

        <div>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tax Amount (Optional)</label>
          <input type="number" value={tax} onChange={e => setTax(e.target.value)} placeholder="Ex: 900" className="form-input" style={{ marginTop: 4 }} />
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Due Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="form-input" style={{ marginTop: 4 }} />
        </div>

        <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button type="submit" disabled={loading} className="btn" style={{ background: '#008E60', color: '#fff' }}>
            {loading ? 'Generating...' : 'Generate Invoice'}
          </button>
        </div>
      </form>
    </div>
  )
}
