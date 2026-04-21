'use client'

import { useState, useTransition, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  searchNamecomDomainsAction,
  addVercelDomainAction,
  purchaseNamecomDomainAction,
} from '@/actions/domain'

// ── TYPES ─────────────────────────────────────────────────────────────────────

type SearchResult = {
  domain: string
  available: boolean
  purchasePrice?: number
  renewalPrice?: number
  premium?: boolean
}

type AddDomainModalProps = {
  tenants: { id: string; name: string; subdomain: string }[]
  onClose: () => void
  onSuccess: (message: string) => void
}

// ── MODAL ─────────────────────────────────────────────────────────────────────

export default function AddDomainModal({ tenants, onClose, onSuccess }: AddDomainModalProps) {
  const [tab, setTab] = useState<'external' | 'namecom'>('external')
  const [selectedTenantId, setSelectedTenantId] = useState(tenants[0]?.id ?? '')
  const [isPending, startTransition] = useTransition()
  const [mounted, setMounted] = useState(false)

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

  // ── External DNS submit ──────────────────────────────────────────────────────
  async function handleExternalSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!externalDomain.trim() || !selectedTenantId) return
    startTransition(async () => {
      const result = await addVercelDomainAction(selectedTenantId, externalDomain.trim())
      setExternalResult(result)
      if (result.success) {
        onSuccess(`Domain "${externalDomain}" added! Set the DNS records shown below.`)
      }
    })
  }

  // ── Name.com search ──────────────────────────────────────────────────────────
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!searchQuery.trim()) return
    startTransition(async () => {
      const { results } = await searchNamecomDomainsAction(searchQuery.trim())
      setSearchResults(results)
      setSearchDone(true)
    })
  }

  // ── Name.com purchase ────────────────────────────────────────────────────────
  async function handlePurchase() {
    if (!confirmDomain || !selectedTenantId) return
    startTransition(async () => {
      const result = await purchaseNamecomDomainAction(selectedTenantId, confirmDomain.domain)
      setPurchaseResult(result)
      if (result.success) {
        onSuccess(`"${confirmDomain.domain}" purchased & DNS auto-configured! 🎉`)
      }
    })
  }

  // ── STYLES ───────────────────────────────────────────────────────────────────
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
    header: {
      padding: '1.5rem 1.5rem 0',
      borderBottom: '1px solid var(--border)',
      paddingBottom: '1rem',
    },
    body: { padding: '1.5rem' },
    input: {
      width: '100%', padding: '0.75rem 1rem', borderRadius: 10,
      background: 'var(--bg-raised)', border: '1px solid var(--border)',
      color: 'var(--text-primary)', fontSize: '0.9375rem', outline: 'none',
      boxSizing: 'border-box' as const,
    },
    select: {
      width: '100%', padding: '0.75rem 1rem', borderRadius: 10,
      background: 'var(--bg-raised)', border: '1px solid var(--border)',
      color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none',
      marginBottom: '1rem',
    },
    label: {
      display: 'block', fontSize: '0.8125rem', fontWeight: 600,
      color: 'var(--text-secondary)', marginBottom: '0.5rem',
    },
    btn: (variant: 'primary' | 'ghost' | 'danger' | 'success') => ({
      padding: '0.625rem 1.25rem', borderRadius: 10, fontWeight: 700,
      fontSize: '0.875rem', cursor: 'pointer', border: 'none',
      ...(variant === 'primary' ? { background: 'linear-gradient(135deg,#00B077,#008E60)', color: '#fff' } : {}),
      ...(variant === 'ghost' ? { background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-muted)' } : {}),
      ...(variant === 'danger' ? { background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', color: '#f43f5e' } : {}),
      ...(variant === 'success' ? { background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' } : {}),
    }),
  }

  if (!mounted) return null

  return createPortal(
    <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={s.modal}>

        {/* Close Button Top Pinned */}
        <button onClick={onClose} style={{
          position: 'absolute', top: '1.25rem', right: '1.25rem',
          width: 32, height: 32, borderRadius: 8, background: 'var(--bg-raised)',
          border: '1px solid var(--border)', color: 'var(--text-muted)',
          cursor: 'pointer', fontSize: '1.125rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10,
        }}>✕</button>

        {/* Header */}
        <div style={s.header}>
          <div style={{ marginBottom: '1rem', paddingRight: '2.5rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Add Domain
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Connect an existing domain or buy one through Name.com
            </p>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {([
              { key: 'external', label: <><span className="material-symbols-outlined" style={{ fontSize: '1.1em', verticalAlign: 'middle' }}>language</span> External DNS</>, sub: 'Point your own domain' },
              { key: 'namecom', label: <><span className="material-symbols-outlined" style={{ fontSize: '1.1em', verticalAlign: 'middle' }}>shopping_cart</span> Buy from Name.com</>, sub: 'Auto-configured DNS' },
            ] as const).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  flex: 1, padding: '0.75rem', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: tab === t.key ? 'rgba(0,176,119,0.15)' : 'var(--bg-raised)',
                  borderBottom: tab === t.key ? '2px solid #00B077' : '2px solid transparent',
                  textAlign: 'left' as const, transition: 'all 150ms',
                }}
              >
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: tab === t.key ? '#818cf8' : 'var(--text-primary)' }}>
                  {t.label}
                </p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.sub}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={s.body}>

          {/* Tenant selector (shared) */}
          <label style={s.label}>Assign to Tenant</label>
          <select value={selectedTenantId} onChange={e => setSelectedTenantId(e.target.value)} style={s.select}>
            {tenants.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.subdomain}.nixvra.online)</option>
            ))}
          </select>

          {/* ── TAB: EXTERNAL DNS ─────────────────────────────────────────── */}
          {tab === 'external' && (
            <div>
              {!externalResult ? (
                <form onSubmit={handleExternalSubmit}>
                  <label style={s.label}>Domain Name</label>
                  <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '0.75rem' }}>
                    <input
                      value={externalDomain}
                      onChange={e => setExternalDomain(e.target.value.toLowerCase().replace(/\s/g, ''))}
                      placeholder="app.yourcompany.com"
                      required
                      style={{ ...s.input, flex: 1 }}
                    />
                    <button type="submit" disabled={isPending} style={s.btn('primary')}>
                      {isPending ? '⏳...' : '→ Add'}
                    </button>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                    The domain will be added to Vercel and approved immediately. You'll need to configure DNS records afterwards.
                  </p>
                </form>
              ) : externalResult.success ? (
                <div>
                  <div style={{
                    padding: '1rem', borderRadius: 12, marginBottom: '1rem',
                    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                  }}>
                    <p style={{ margin: 0, fontWeight: 700, color: '#10b981', fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="material-symbols-outlined">check_circle</span> Domain added to Vercel! Configure DNS below.
                    </p>
                  </div>

                  {externalResult.vercelRequiredRecords?.length > 0 && (
                    <div>
                      <p style={{ ...s.label, marginBottom: '0.75rem' }}>Required DNS Records</p>
                      {externalResult.vercelRequiredRecords.map((r: any, i: number) => (
                        <div key={i} style={{
                          borderRadius: 10, overflow: 'hidden',
                          border: '1px solid var(--border)', marginBottom: '0.5rem',
                        }}>
                          <div style={{
                            display: 'grid', gridTemplateColumns: '70px 1fr 1fr',
                            padding: '0.625rem 0.875rem', gap: '1rem',
                            background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)',
                            fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em',
                            color: 'var(--text-muted)', textTransform: 'uppercase' as const,
                          }}>
                            <span>Type</span><span>Name</span><span>Value</span>
                          </div>
                          <div style={{
                            display: 'grid', gridTemplateColumns: '70px 1fr 1fr',
                            padding: '0.75rem 0.875rem', gap: '1rem',
                          }}>
                            <code style={{ fontSize: '0.8125rem', color: '#f59e0b', fontFamily: 'monospace' }}>{r.type}</code>
                            <code style={{ fontSize: '0.8125rem', color: '#818cf8', fontFamily: 'monospace' }}>{r.name}</code>
                            <code
                              style={{ fontSize: '0.8125rem', color: '#818cf8', fontFamily: 'monospace', cursor: 'pointer', overflowWrap: 'anywhere' }}
                              onClick={() => navigator.clipboard.writeText(r.value)}
                              title="Click to copy"
                            >{r.value}</code>
                          </div>
                        </div>
                      ))}
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1em' }}>lightbulb</span> Click any value to copy. DNS propagation can take up to 48h. Then click "Check DNS" on the domain.
                      </p>
                    </div>
                  )}

                  <button onClick={onClose} style={{ ...s.btn('ghost'), marginTop: '1rem' }}>Done</button>
                </div>
              ) : (
                <div style={{
                  padding: '1rem', borderRadius: 12,
                  background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)',
                }}>
                  <p style={{ margin: 0, color: '#f43f5e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}><span className="material-symbols-outlined">cancel</span> {externalResult.error}</p>
                  <button onClick={() => setExternalResult(null)} style={{ ...s.btn('ghost'), marginTop: '0.75rem', fontSize: '0.8125rem' }}>
                    Try Again
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: NAME.COM ─────────────────────────────────────────────── */}
          {tab === 'namecom' && (
            <div>
              {!purchaseResult ? (
                <>
                  {/* Search */}
                  {!confirmDomain ? (
                    <>
                      <form onSubmit={handleSearch} style={{ marginBottom: '1rem' }}>
                        <label style={s.label}>Search Domain</label>
                        <div style={{ display: 'flex', gap: '0.625rem' }}>
                          <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value.toLowerCase().replace(/\s/g, ''))}
                            placeholder="mycompany.com"
                            required
                            style={{ ...s.input, flex: 1 }}
                          />
                          <button type="submit" disabled={isPending} style={{ ...s.btn('primary'), display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {isPending ? <span className="material-symbols-outlined" style={{ fontSize: '1.2em' }}>hourglass_empty</span> : <><span className="material-symbols-outlined" style={{ fontSize: '1.2em' }}>search</span> Search</>}
                          </button>
                        </div>
                      </form>

                      {searchDone && searchResults.length === 0 && (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No results found.</p>
                      )}

                      {searchResults.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {searchResults.map(r => (
                            <div key={r.domain} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '0.875rem 1rem', borderRadius: 12,
                              background: r.available ? 'var(--bg-raised)' : 'rgba(0,0,0,0.02)',
                              border: `1px solid ${r.available ? 'rgba(16,185,129,0.25)' : 'var(--border)'}`,
                              opacity: r.available ? 1 : 0.5,
                            }}>
                              <div>
                                <p style={{ margin: 0, fontWeight: 700, fontFamily: 'monospace', fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                                  {r.domain}
                                </p>
                                <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: r.available ? '#10b981' : 'var(--text-muted)' }}>
                                  {r.available ? `Available` : 'Not Available'}
                                  {r.premium && ' · Premium'}
                                </p>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                {r.purchasePrice && (
                                  <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                                    ₹{Math.round(r.purchasePrice * 83.5)}<span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 400 }}>/yr</span>
                                  </span>
                                )}
                                {r.available && (
                                  <button onClick={() => setConfirmDomain(r)} style={s.btn('success')}>
                                    Select →
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    /* Confirm Order */
                    <div>
                      <div style={{
                        padding: '1.25rem', borderRadius: 14,
                        background: 'var(--bg-raised)', border: '1px solid rgba(0,176,119,0.3)',
                        marginBottom: '1.25rem',
                      }}>
                        <p style={{ margin: '0 0 0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Order Preview
                        </p>
                        <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                          {confirmDomain.domain}
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
                          {[
                            { label: 'Purchase Price', value: confirmDomain.purchasePrice ? `₹${Math.round(confirmDomain.purchasePrice * 83.5)}/year` : 'Market rate' },
                            { label: 'Renewal Price', value: confirmDomain.renewalPrice ? `₹${Math.round(confirmDomain.renewalPrice * 83.5)}/year` : 'Same' },
                            { label: 'DNS Setup', value: '✅ Auto-configured' },
                            { label: 'Vercel Integration', value: '✅ Auto-added' },
                            { label: 'Privacy Protection', value: '✅ Included free' },
                            { label: 'Registration', value: '1 year' },
                          ].map(item => (
                            <div key={item.label}>
                              <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{item.label}</p>
                              <p style={{ margin: '0.125rem 0 0', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {item.value}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{
                        padding: '0.875rem', borderRadius: 10, marginBottom: '1rem',
                        background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                        fontSize: '0.8125rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px'
                      }}>
                        <span className="material-symbols-outlined">warning</span> This will charge your Name.com account. DNS records will be auto-configured and domain will go ACTIVE immediately.
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button onClick={() => setConfirmDomain(null)} style={s.btn('ghost')}>← Back</button>
                        <button onClick={handlePurchase} disabled={isPending} style={{ ...s.btn('primary'), flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          {isPending ? 'Processing...' : <><span className="material-symbols-outlined" style={{ fontSize: '1.2em' }}>shopping_cart</span> Purchase Domain</>}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Purchase Result */
                purchaseResult.success ? (
                  <div>
                    <div style={{
                      padding: '1.25rem', borderRadius: 14, marginBottom: '1rem',
                      background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                    }}>
                      <p style={{ margin: '0 0 0.5rem', fontWeight: 800, fontSize: '1rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="material-symbols-outlined">celebration</span> Domain Purchased!
                      </p>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        Order ID: <code style={{ color: '#818cf8' }}>{purchaseResult.orderId}</code>
                      </p>
                      <p style={{ margin: '0.375rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        DNS {purchaseResult.dnsConfigured ? 'auto-configured ✅' : 'partially configured ⚠️'}
                      </p>
                    </div>
                    {purchaseResult.dnsErrors?.length > 0 && (
                      <div style={{
                        padding: '0.875rem', borderRadius: 10, marginBottom: '1rem',
                        background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)',
                        fontSize: '0.8125rem', color: '#f43f5e',
                      }}>
                        ⚠️ Minor DNS issues (may need manual check):
                        <ul style={{ margin: '0.375rem 0 0', paddingLeft: '1.25rem' }}>
                          {purchaseResult.dnsErrors.map((e: string, i: number) => <li key={i}>{e}</li>)}
                        </ul>
                      </div>
                    )}
                    <button onClick={onClose} style={s.btn('primary')}>Done →</button>
                  </div>
                ) : (
                  <div style={{
                    padding: '1rem', borderRadius: 12,
                    background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)',
                  }}>
                    <p style={{ margin: 0, color: '#f43f5e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}><span className="material-symbols-outlined">cancel</span> {purchaseResult.error}</p>
                    <button onClick={() => { setPurchaseResult(null); setConfirmDomain(null) }} style={{ ...s.btn('ghost'), marginTop: '0.75rem' }}>
                      Try Again
                    </button>
                  </div>
                )
              )}
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body
  )
}
