'use client'

import { useState, useTransition, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  searchNamecomDomainsAction,
  addVercelDomainAction,
  purchaseNamecomDomainAction,
} from '@/actions/domain'

type SearchResult = {
  domain: string
  available: boolean
  purchasePrice?: number
  renewalPrice?: number
  premium?: boolean
}

type TenantAddDomainModalProps = {
  tenantId: string
  onClose: () => void
}

export default function TenantAddDomainModal({ tenantId, onClose }: TenantAddDomainModalProps) {
  const [tab, setTab] = useState<'external' | 'namecom'>('external')
  const [isPending, startTransition] = useTransition()
  const [mounted, setMounted] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => { setMounted(true) }, [])

  // External DNS state
  const [externalDomain, setExternalDomain] = useState('')
  const [externalResult, setExternalResult] = useState<any>(null)

  // Name.com state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchDone, setSearchDone] = useState(false)
  const [confirmDomain, setConfirmDomain] = useState<SearchResult | null>(null)
  const [purchaseResult, setPurchaseResult] = useState<any>(null)

  async function handleExternalSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!externalDomain.trim() || !tenantId) return
    startTransition(async () => {
      const result = await addVercelDomainAction(tenantId, externalDomain.trim())
      setExternalResult(result)
      if (result.success) setSuccessMsg(`Domain added! Prepare to configure your DNS.`)
    })
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!searchQuery.trim()) return
    startTransition(async () => {
      const { results } = await searchNamecomDomainsAction(searchQuery.trim())
      setSearchResults(results)
      setSearchDone(true)
    })
  }

  async function handlePurchase() {
    if (!confirmDomain || !tenantId) return
    startTransition(async () => {
      const result = await purchaseNamecomDomainAction(tenantId, confirmDomain.domain)
      setPurchaseResult(result)
      if (result.success) setSuccessMsg(`"${confirmDomain.domain}" purchased & mapping initialized!`)
    })
  }

  const s = {
    overlay: {
      position: 'fixed' as const, inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '3rem 1rem', overflowY: 'auto' as const,
    },
    modal: {
      position: 'relative' as const, margin: 'auto',
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 20, width: '100%', maxWidth: 620,
      display: 'flex', flexDirection: 'column' as const,
      overflow: 'hidden', boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
    },
    header: { padding: '1.5rem 1.5rem 0', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' },
    body: { padding: '1.5rem' },
    input: {
      width: '100%', padding: '0.75rem 1rem', borderRadius: 10,
      background: 'var(--bg-raised)', border: '1px solid var(--border)',
      color: 'var(--text-primary)', fontSize: '0.9375rem', outline: 'none', boxSizing: 'border-box' as const,
    },
    label: { display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' },
    btn: (variant: 'primary' | 'ghost' | 'danger' | 'success') => ({
      padding: '0.625rem 1.25rem', borderRadius: 10, fontWeight: 700,
      fontSize: '0.875rem', cursor: 'pointer', border: 'none',
      ...(variant === 'primary' ? { background: 'linear-gradient(135deg,#00B077,#008E60)', color: '#fff' } : {}),
      ...(variant === 'ghost' ? { background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-muted)' } : {}),
      ...(variant === 'success' ? { background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' } : {}),
    }),
  }

  if (!mounted) return null

  return createPortal(
    <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) { window.location.reload(); onClose() } }}>
      <div style={s.modal}>
        <button onClick={() => { window.location.reload(); onClose() }} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', width: 32, height: 32, borderRadius: 8, background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.125rem' }}>✕</button>

        <div style={s.header}>
          <div style={{ marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)' }}>Secure Domain</h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Map a domain directly to your workspace.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => setTab('external')} style={{ flex: 1, padding: '0.75rem', borderRadius: 10, border: 'none', cursor: 'pointer', background: tab === 'external' ? 'rgba(0,176,119,0.15)' : 'var(--bg-raised)', borderBottom: tab === 'external' ? '2px solid #00B077' : '2px solid transparent', textAlign: 'left', transition: 'all 150ms' }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: tab === 'external' ? '#00B077' : 'var(--text-primary)' }}>Link Existing</p>
            </button>
            <button onClick={() => setTab('namecom')} style={{ flex: 1, padding: '0.75rem', borderRadius: 10, border: 'none', cursor: 'pointer', background: tab === 'namecom' ? 'rgba(0,176,119,0.15)' : 'var(--bg-raised)', borderBottom: tab === 'namecom' ? '2px solid #00B077' : '2px solid transparent', textAlign: 'left', transition: 'all 150ms' }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: tab === 'namecom' ? '#00B077' : 'var(--text-primary)' }}>Purchase New</p>
            </button>
          </div>
        </div>

        <div style={s.body}>
          {successMsg && (
            <div style={{ padding: '1rem', borderRadius: 12, marginBottom: '1.5rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <p style={{ margin: 0, fontWeight: 700, color: '#10b981', fontSize: '0.9375rem' }}>{successMsg}</p>
            </div>
          )}

          {tab === 'external' && !externalResult && (
            <form onSubmit={handleExternalSubmit}>
              <label style={s.label}>Domain Name</label>
              <div style={{ display: 'flex', gap: '0.625rem' }}>
                <input value={externalDomain} onChange={e => setExternalDomain(e.target.value)} placeholder="app.mycompany.com" required style={{ ...s.input, flex: 1 }} />
                <button type="submit" disabled={isPending} style={s.btn('primary')}>{isPending ? '⏳...' : 'Link →'}</button>
              </div>
            </form>
          )}

          {tab === 'external' && externalResult && (
             <div>
                {externalResult.success ? (
                   <div>
                      {externalResult.vercelRequiredRecords?.length > 0 && (
                        <div>
                          <p style={{ ...s.label, marginBottom: '0.75rem' }}>Required DNS Records (Add these to your provider)</p>
                          {externalResult.vercelRequiredRecords.map((r: any, i: number) => (
                            <div key={i} style={{ borderRadius: 10, border: '1px solid var(--border)', marginBottom: '0.5rem', padding: '1rem', background: 'var(--bg-raised)' }}>
                              <p style={{ margin: 0, fontSize: '0.8125rem' }}>Type: <b>{r.type}</b></p>
                              <p style={{ margin: 0, fontSize: '0.8125rem' }}>Name: <b>{r.name}</b></p>
                              <p style={{ margin: 0, fontSize: '0.8125rem' }}>Value: <b>{r.value}</b></p>
                            </div>
                          ))}
                        </div>
                      )}
                      <button onClick={() => { window.location.reload(); onClose() }} style={{ ...s.btn('primary'), marginTop: '1rem' }}>Done</button>
                   </div>
                ) : (
                   <p style={{ color: '#f43f5e' }}>{externalResult.error}</p>
                )}
             </div>
          )}

          {tab === 'namecom' && !purchaseResult && (
            <>
              {!confirmDomain ? (
                <>
                  <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.625rem', marginBottom: '1rem' }}>
                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="searchdomain.com" required style={{ ...s.input, flex: 1 }} />
                    <button type="submit" disabled={isPending} style={s.btn('primary')}>{isPending ? '⏳' : 'Search'}</button>
                  </form>
                  {searchDone && searchResults.map(r => (
                    <div key={r.domain} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-raised)', borderRadius: 12, marginBottom: '0.5rem' }}>
                      <div>
                         <p style={{ margin: 0, fontWeight: 700 }}>{r.domain}</p>
                         <p style={{ margin: 0, fontSize: '0.75rem', color: r.available ? '#10b981' : 'var(--text-muted)' }}>{r.available ? 'Available' : 'Unavailable'}</p>
                      </div>
                      {r.available && r.purchasePrice && (
                         <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                           <span style={{ fontWeight: 800 }}>₹{Math.round(r.purchasePrice * 83.5)}</span>
                           <button onClick={() => setConfirmDomain(r)} style={s.btn('success')}>Buy</button>
                         </div>
                      )}
                    </div>
                  ))}
                </>
              ) : (
                <div>
                   <h3 style={{ margin: '0 0 1rem' }}>Confirm Purchase: {confirmDomain.domain}</h3>
                   <div style={{ display: 'flex', gap: '1rem' }}>
                     <button onClick={() => setConfirmDomain(null)} style={s.btn('ghost')}>Back</button>
                     <button onClick={handlePurchase} disabled={isPending} style={{ ...s.btn('primary'), flex: 1 }}>{isPending ? 'Processing Payment...' : 'Secure Now'}</button>
                   </div>
                </div>
              )}
            </>
          )}

          {tab === 'namecom' && purchaseResult && (
             <div>
                {purchaseResult.success ? (
                   <button onClick={() => { window.location.reload(); onClose() }} style={s.btn('primary')}>Finish Setup</button>
                ) : (
                   <div style={{ color: '#f43f5e' }}>{purchaseResult.error}</div>
                )}
             </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
