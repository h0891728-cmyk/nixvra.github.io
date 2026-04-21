'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { getExpensesAction, createExpenseAction, updateExpenseStatusAction, getExpenseCategoriesAction } from '@/actions/expenses'
import { formatCompactCurrency } from '@/lib/format'
import { generateExpensePDF } from '@/lib/pdf-generator'

export default function ExpensesDashboard({
  tenantId,
  role,
  tenantName,
  tenantSubdomain,
}: {
  tenantId: string
  role: string
  tenantName: string
  tenantSubdomain: string
}) {
  const [expenses, setExpenses] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  
  const [showCreate, setShowCreate] = useState(false)
  
  // Form State
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [catId, setCatId] = useState('')

  const load = async () => {
    setLoading(true)
    const [res, cats] = await Promise.all([
      getExpensesAction(),
      getExpenseCategoriesAction()
    ])
    if (res.expenses) setExpenses(res.expenses)
    setCategories(cats)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const handleSubmit = () => {
    if (!amount || !desc) return
    startTransition(async () => {
      const res = await createExpenseAction({
        amount: parseFloat(amount),
        description: desc,
        dateOfExpense: date,
        categoryId: catId || undefined
      })
      if (res.success && res.expense) {
        generateExpensePDF(res.expense, { name: tenantName, subdomain: tenantSubdomain })
        showToast('Expense saved and PDF downloaded.', true)
      } else {
        showToast(res.error || 'Failed to create expense', false)
      }
      setAmount('')
      setDesc('')
      setShowCreate(false)
      await load()
    })
  }

  const handleStatus = (pubId: string, status: 'APPROVED' | 'REJECTED' | 'PAID') => {
    startTransition(async () => {
      const res = await updateExpenseStatusAction(pubId, status)
      if (res.success && res.expense) {
        generateExpensePDF(res.expense, { name: tenantName, subdomain: tenantSubdomain })
        showToast(`Expense ${status.toLowerCase().replace('_', ' ')} and PDF downloaded.`, true)
      } else {
        showToast(res.error || 'Failed to update expense status', false)
      }
      await load()
    })
  }

  const isAdmin = role === 'SUPER_ADMIN' || role === 'TENANT_ADMIN'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: toast.ok ? 'rgba(16,185,129,0.95)' : 'rgba(244,63,94,0.95)', color: '#fff', padding: '0.75rem 1rem', borderRadius: 12, fontWeight: 700, fontSize: '0.8125rem', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
          {toast.msg}
        </div>
      )}
      
      {/* Top Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: 16, border: '1px solid var(--border)' }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL SPENT</p>
          <h3 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)' }}>
            {formatCompactCurrency(expenses.filter(e => e.status === 'PAID' || e.status === 'APPROVED').reduce((s, e) => s + e.amount, 0))}
          </h3>
        </div>
        <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: 16, border: '1px solid var(--border)' }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>PENDING APPROVAL</p>
          <h3 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: '#f59e0b' }}>
            {formatCompactCurrency(expenses.filter(e => e.status === 'PENDING_APPROVAL').reduce((s, e) => s + e.amount, 0))}
          </h3>
        </div>
        <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: 16, border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button onClick={() => setShowCreate(!showCreate)} className="btn btn-primary" style={{ width: '100%' }}>
            <span className="material-symbols-outlined">{showCreate ? 'close' : 'add'}</span>
            {showCreate ? 'Cancel' : 'Record Expense'}
          </button>
        </div>
      </div>

      {showCreate && (
        <div style={{ background: 'var(--bg-raised)', padding: '1.5rem', borderRadius: 16, border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 800 }}>New Expense Entity</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Amount (₹)</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="form-input" placeholder="0.00" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="form-input" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Category</label>
              <select value={catId} onChange={e => setCatId(e.target.value)} className="form-input">
                <option value="">Select Category...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Description / Reason</label>
              <input value={desc} onChange={e => setDesc(e.target.value)} className="form-input" placeholder="e.g., Server hosting bill" />
            </div>
          </div>
          <button onClick={handleSubmit} disabled={isPending || !amount || !desc} className="btn btn-primary">
            {isPending ? 'Saving...' : 'Submit Expense'}
          </button>
        </div>
      )}

      {/* List */}
      <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 16, border: '1px solid var(--border)' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 800 }}>Expense History</h3>
        {loading ? <p>Loading...</p> : expenses.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No expenses recorded.</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
             <thead>
               <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                 <th style={{ padding: '0.75rem 0' }}>Date</th>
                 <th>Description & Category</th>
                 <th>Vendor</th>
                 <th>Amount</th>
                 <th>Status</th>
                 {isAdmin && <th>Actions</th>}
               </tr>
             </thead>
             <tbody>
               {expenses.map((e) => (
                 <tr key={e.publicId} style={{ borderBottom: '1px dashed var(--border)' }}>
                   <td style={{ padding: '1rem 0', color: 'var(--text-muted)' }}>
                     {new Date(e.dateOfExpense).toLocaleDateString('en-IN')}
                   </td>
                   <td>
                     <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{e.description}</div>
                     <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', background: 'var(--bg-raised)', display: 'inline-block', padding: '0.1rem 0.4rem', borderRadius: 4, marginTop: 4 }}>
                       {e.categoryName}
                     </div>
                   </td>
                   <td style={{ color: e.vendorName !== 'Unknown Vendor' ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                     {e.vendorName}
                   </td>
                   <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                     ₹{Number(e.amount).toLocaleString('en-IN')}
                   </td>
                   <td>
                     <span style={{
                       fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 999,
                       background: e.status === 'PAID' ? 'rgba(16,185,129,0.1)' : 
                                   e.status === 'PENDING_APPROVAL' ? 'rgba(245,158,11,0.1)' : 
                                   e.status === 'REJECTED' ? 'rgba(244,63,94,0.1)' : 'var(--bg-raised)',
                       color: e.status === 'PAID' ? '#10b981' : 
                              e.status === 'PENDING_APPROVAL' ? '#f59e0b' : 
                              e.status === 'REJECTED' ? '#f43f5e' : 'var(--text-primary)'
                     }}>
                       {e.status.replace('_', ' ')}
                     </span>
                   </td>
                   {isAdmin && (
                     <td>
                       <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                         {e.status === 'PENDING_APPROVAL' && (
                           <>
                             <button onClick={() => handleStatus(e.publicId, 'APPROVED')} disabled={isPending} className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'none' }}>Approve</button>
                             <button onClick={() => handleStatus(e.publicId, 'REJECTED')} disabled={isPending} className="btn btn-sm" style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: 'none' }}>Reject</button>
                           </>
                         )}
                         {e.status === 'APPROVED' && (
                           <button onClick={() => handleStatus(e.publicId, 'PAID')} disabled={isPending} className="btn btn-sm" style={{ background: 'var(--bg-raised)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>Mark Paid</button>
                         )}
                         <button
                           onClick={() => generateExpensePDF(e, { name: tenantName, subdomain: tenantSubdomain })}
                           className="btn btn-sm"
                           style={{ background: 'rgba(0,176,119,0.08)', color: '#00B077', border: '1px solid rgba(0,176,119,0.16)' }}
                         >
                           PDF
                         </button>
                       </div>
                     </td>
                   )}
                 </tr>
               ))}
             </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
