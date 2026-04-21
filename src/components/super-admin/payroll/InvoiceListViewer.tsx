'use client'

import React, { useState, useEffect, useCallback, useTransition } from 'react'
import { getInvoiceList, updateInvoiceStatus } from '@/actions/payroll'
import { createDetailedInvoiceAction, getInvoiceDetailsAction, getProductsAction } from '@/actions/invoice-items'
import { generateInvoicePDF } from '@/lib/pdf-generator'
import PaginationControls from '@/components/ui/PaginationControls'

// ... existing types
type Invoice = {
  id: string
  publicId: string
  invoiceNumber: string | null
  businessEntityId: string
  entityName: string
  entityType: string
  amount: number
  taxAmount: number
  status: string
  dueDate: Date | null
  createdAt: Date
}

const STATUS_OPTS = ['ALL', 'PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED']

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  PAID:               { bg: 'rgba(16,185,129,0.12)',  color: '#10b981' },
  PENDING:            { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b' },
  FAILED:             { bg: 'rgba(244,63,94,0.12)',   color: '#f43f5e' },
  REFUNDED:           { bg: 'rgba(0,176,119,0.12)',  color: '#00B077' },
  PARTIALLY_REFUNDED: { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8' },
}

function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.PENDING
  return (
    <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: 999, background: s.bg, color: s.color, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
      {status.replace('_', ' ')}
    </span>
  )
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

type Props = {
  tenantId: string
  entities: { id: string; name: string }[]
  tenantName: string
  tenantSubdomain: string
}

export default function InvoiceListViewer({ tenantId, entities, tenantName, tenantSubdomain }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10
  
  // Create form state (Itemized)
  const [entityId, setEntityId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [items, setItems] = useState([{ productId: '', name: '', qty: 1, price: 0, tax: 0 }])
  const [products, setProducts] = useState<any[]>([])

  // Expanded details state
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detailsCache, setDetailsCache] = useState<Record<string, any>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getInvoiceList(tenantId, statusFilter)
      setInvoices(data as Invoice[])
      setCurrentPage(1)
      
      const prods = await getProductsAction()
      setProducts(prods)
    } catch (_) {}
    setLoading(false)
  }, [tenantId, statusFilter])

  useEffect(() => { load() }, [load])

  async function handleStatusChange(inv: Invoice, newStatus: 'PAID' | 'FAILED' | 'REFUNDED') {
    startTransition(async () => {
      await updateInvoiceStatus(tenantId, inv.publicId, newStatus)
      await load()
    })
  }

  async function toggleDetails(publicId: string) {
    if (expandedId === publicId) {
      setExpandedId(null)
      return
    }
    setExpandedId(publicId)
    if (!detailsCache[publicId]) {
      const details = await getInvoiceDetailsAction(publicId)
      if (details) {
        setDetailsCache(p => ({ ...p, [publicId]: details }))
      }
    }
  }

  function handleAddItem() {
    setItems([...items, { productId: '', name: '', qty: 1, price: 0, tax: 0 }])
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!entityId || items.length === 0) return
    startTransition(async () => {
      const formattedItems = items.map(i => ({
        productId: i.productId || undefined,
        itemName: i.name || 'Custom Item',
        quantity: i.qty,
        unitPrice: i.price,
        taxAmount: i.tax * i.qty,
        discount: 0,
        total: (i.price * i.qty) + (i.tax * i.qty)
      }))

      const res = await createDetailedInvoiceAction({
        businessEntityPublicId: entityId,
        dueDate: dueDate || undefined,
        items: formattedItems
      })

      if (res.success && res.invoicePublicId) {
        const details = await getInvoiceDetailsAction(res.invoicePublicId)
        if (details) {
          setDetailsCache(prev => ({ ...prev, [res.invoicePublicId as string]: details }))
          generateInvoicePDF(details, { name: tenantName, subdomain: tenantSubdomain })
        }
      }
      
      setEntityId(''); setItems([{ productId: '', name: '', qty: 1, price: 0, tax: 0 }]); setDueDate('')
      setShowCreateForm(false)
      await load()
    })
  }

  const grandTotal = items.reduce((sum, i) => sum + (i.qty * i.price) + (i.qty * i.tax), 0)
  const totalPages = Math.max(1, Math.ceil(invoices.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedInvoices = invoices.slice((safePage - 1) * pageSize, safePage * pageSize)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 800 }}>Invoices & Billing</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="form-input"
            style={{ minWidth: 170 }}
          >
            {STATUS_OPTS.map(status => <option key={status} value={status}>{status === 'ALL' ? 'All Statuses' : status.replace('_', ' ')}</option>)}
          </select>
          <button onClick={load} style={{ padding: '0.4rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--text-primary)', cursor: 'pointer' }}>
            Refresh
          </button>
          <button
            onClick={() => setShowCreateForm(v => !v)}
            style={{ padding: '0.4rem 0.875rem', borderRadius: 8, border: 'none', background: showCreateForm ? 'var(--bg-raised)' : '#008E60', color: showCreateForm ? 'var(--text-secondary)' : '#fff', cursor: 'pointer', fontWeight: 700 }}
          >
            {showCreateForm ? 'Cancel' : '+ New Itemized Invoice'}
          </button>
        </div>
      </div>

      {/* Inline Create Form */}
      {showCreateForm && (
        <div style={{ background: 'var(--bg-surface)', border: '2px dashed #008E60', borderRadius: 14, padding: '1.25rem' }}>
          <h4 style={{ margin: '0 0 1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Create Billed Invoice</h4>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'flex', gap: 12, marginBottom: '1rem' }}>
              <select value={entityId} onChange={e => setEntityId(e.target.value)} required className="form-input" style={{ flex: 1 }}>
                <option value="">Select Billed Entity...</option>
                {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="form-input" />
            </div>

            {/* Line Items */}
            <div style={{ background: 'var(--bg-raised)', padding: '1rem', borderRadius: 8, marginBottom: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 50px', gap: 8, marginBottom: 8, fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                <span>Item/Service Name</span><span>Qty</span><span>Unit Price</span><span>Tax/Unit</span><span></span>
              </div>
              {items.map((it, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 50px', gap: 8, marginBottom: 8 }}>
                  <div style={{ position: 'relative' }}>
                    <input 
                      list="product-catalog"
                      type="text" 
                      value={it.name} 
                      onChange={e => { 
                        const n = [...items]; 
                        n[idx].name = e.target.value; 
                        const prod = products.find(p => p.name === e.target.value);
                        if (prod) {
                          n[idx].productId = prod.id;
                          n[idx].price = prod.price;
                          n[idx].tax = 0;
                        }
                        setItems(n) 
                      }} 
                      required className="form-input" placeholder="e.g. Server Consultation" style={{ width: '100%' }} />
                    <datalist id="product-catalog">
                      {products.map(p => <option key={p.id} value={p.name} />)}
                    </datalist>
                  </div>
                  <input type="number" value={it.qty} onChange={e => { const n = [...items]; n[idx].qty = parseFloat(e.target.value)||0; setItems(n) }} required className="form-input" min="0.1" step="0.1" />
                  <input type="number" value={it.price} onChange={e => { const n = [...items]; n[idx].price = parseFloat(e.target.value)||0; setItems(n) }} required className="form-input" />
                  <input type="number" value={it.tax} onChange={e => { const n = [...items]; n[idx].tax = parseFloat(e.target.value)||0; setItems(n) }} required className="form-input" />
                  <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))} style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: 'none', borderRadius: 6, cursor: 'pointer' }}>X</button>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <button type="button" onClick={handleAddItem} className="btn btn-sm" style={{ background: 'var(--bg-overlay)' }}>+ Add Line Item</button>
                <div style={{ fontWeight: 900, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Total: {fmt(grandTotal)}</div>
              </div>
            </div>

            <button type="submit" disabled={isPending || items.length === 0} className="btn" style={{ background: '#008E60', color: '#fff', width: '100%' }}>
              {isPending ? 'Generating...' : 'Finalize & Generate Invoice'}
            </button>
          </form>
        </div>
      )}

      {/* Invoice Table */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        {loading ? <p style={{ padding: '2rem', textAlign: 'center' }}>Loading invoices...</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-raised)' }}>
                <th style={{ padding: '0.875rem 1rem' }}>Invoice #</th>
                <th>Billed To</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedInvoices.map(inv => (
                <React.Fragment key={inv.id}>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.875rem 1rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                      <button onClick={() => toggleDetails(inv.publicId)} style={{ background:'none', border:'none', color:'#00B077', textDecoration:'underline', cursor:'pointer', fontWeight:700 }}>
                        {inv.invoiceNumber ?? inv.publicId.slice(0, 12)}
                      </button>
                    </td>
                    <td style={{ fontWeight: 700 }}>{inv.entityName} <span style={{fontSize:'0.65rem', color:'var(--text-muted)', display:'block'}}>{inv.entityType}</span></td>
                    <td style={{ fontWeight: 900 }}>{fmt(inv.amount + inv.taxAmount)}</td>
                    <td><StatusPill status={inv.status} /></td>
                    <td>
                      {inv.status === 'PENDING' && <button onClick={() => handleStatusChange(inv, 'PAID')} disabled={isPending} className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'none' }}>Mark Paid</button>}
                    </td>
                  </tr>
                  {/* Expanded Itemized Row */}
                  {expandedId === inv.publicId && (
                    <tr>
                      <td colSpan={5} style={{ padding: 0, borderBottom: '1px solid var(--border)' }}>
                        <div style={{ background: 'var(--bg-raised)', padding: '1rem', borderLeft: '4px solid #00B077' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <h5 style={{ margin: 0, fontWeight: 800 }}>Invoice Details</h5>
                            {detailsCache[inv.publicId] && (
                              <button 
                                onClick={() => generateInvoicePDF(detailsCache[inv.publicId], { name: tenantName, subdomain: tenantSubdomain })}
                                style={{ background: 'none', border: '1px solid var(--border)', padding: '0.3rem 0.6rem', borderRadius: 6, fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600, color: 'var(--brand-500)', display: 'flex', alignItems: 'center', gap: 4 }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>picture_as_pdf</span>
                                Download PDF
                              </button>
                            )}
                          </div>
                          {detailsCache[inv.publicId] ? (
                            <table style={{ width: '100%', background: 'var(--bg-surface)', borderRadius: 8, overflow: 'hidden' }}>
                              <thead>
                                <tr style={{ background: 'var(--bg-overlay)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                  <th style={{ padding: '0.5rem' }}>Line Item</th>
                                  <th>Qty</th>
                                  <th>Unit Price</th>
                                  <th>Line Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {detailsCache[inv.publicId].items.map((item: any) => (
                                  <tr key={item.id} style={{ borderBottom: '1px dashed var(--border)' }}>
                                    <td style={{ padding: '0.5rem', fontWeight: 600 }}>{item.name}</td>
                                    <td>{item.quantity}</td>
                                    <td>{fmt(item.unitPrice)}</td>
                                    <td style={{ fontWeight: 700 }}>{fmt(item.total)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : <p style={{ margin: 0, color: '#f59e0b' }}>Loading itemized schema...</p>}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
        <PaginationControls
          currentPage={safePage}
          totalItems={invoices.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemLabel="invoices"
        />
      </div>
    </div>
  )
}
