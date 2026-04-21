'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { getGlobalSocialAccounts, SocialAccount } from '@/actions/super-admin-social'
import PaginationControls from '@/components/ui/PaginationControls'

const PROVIDER_META: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  META_GRAPH: {
    label: 'Meta Graph API',
    icon: 'public',
    color: '#1877F2',
    bg: 'rgba(24,119,242,0.1)',
  },
  WHATSAPP_CLOUD: {
    label: 'WhatsApp Cloud',
    icon: 'chat',
    color: '#25d366',
    bg: 'rgba(37,211,102,0.1)',
  },
}

export default function PlatformAccountManager() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState<'ALL' | 'META_GRAPH' | 'WHATSAPP_CLOUD'>('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getGlobalSocialAccounts()
    setAccounts(data)
    setCurrentPage(1)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { setCurrentPage(1) }, [filter, accounts.length])

  const filtered = accounts.filter(a => filter === 'ALL' || a.provider === filter)
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedAccounts = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
  const metaCount = accounts.filter(a => a.provider === 'META_GRAPH').length
  const waCount   = accounts.filter(a => a.provider === 'WHATSAPP_CLOUD').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.875rem' }}>
        {[
          { label: 'Total Connected', value: accounts.length, icon: 'hub', color: '#00B077', bg: 'rgba(0,176,119,0.1)' },
          { label: 'Meta Graph', value: metaCount, icon: 'public', color: '#1877F2', bg: 'rgba(24,119,242,0.1)' },
          { label: 'WhatsApp Cloud', value: waCount, icon: 'chat', color: '#25d366', bg: 'rgba(37,211,102,0.1)' },
          { label: 'Inactive', value: accounts.filter(a => !a.isActive).length, icon: 'link_off', color: '#f43f5e', bg: 'rgba(244,63,94,0.1)' },
        ].map(card => (
          <div key={card.label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: card.color }}>{card.icon}</span>
            </div>
            <div>
              <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>{card.value}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Account List */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.4rem', color: '#00B077' }}>account_circle</span>
            <p style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--text-primary)', margin: 0 }}>Platform Accounts</p>
          </div>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            {(['ALL', 'META_GRAPH', 'WHATSAPP_CLOUD'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '0.375rem 0.75rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: '0.75rem', transition: 'all 150ms',
                  background: filter === f ? '#00B077' : 'var(--bg-raised)',
                  color: filter === f ? '#fff' : 'var(--text-muted)',
                }}
              >
                {f === 'ALL' ? 'All' : f === 'META_GRAPH' ? 'Meta' : 'WhatsApp'}
              </button>
            ))}
            <button onClick={load} disabled={loading} style={{ padding: '0.45rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>refresh</span>
            </button>
          </div>
        </div>

        {/* Table Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr', padding: '0.625rem 1.5rem', background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
          {['Tenant', 'Platform', 'Account', 'Pages/Links', 'Status'].map(h => (
            <span key={h} style={{ fontSize: '0.6875rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem', opacity: 0.4 }}>account_tree</span>
            Scanning all tenant integrations...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem', opacity: 0.4 }}>link_off</span>
            No connected accounts found for this filter.
          </div>
        ) : (
          <div>
            {paginatedAccounts.map((account, idx) => {
              const pm = PROVIDER_META[account.provider] || PROVIDER_META.META_GRAPH
              return (
                <div
                  key={`${account.tenantId}-${account.provider}-${idx}`}
                  style={{
                    display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr',
                    padding: '0.875rem 1.5rem', alignItems: 'center',
                    borderBottom: '1px solid var(--border)', transition: 'background 150ms',
                  }}
                >
                  {/* Tenant */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,176,119,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: '#00B077' }}>corporate_fare</span>
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', margin: 0 }}>{account.tenantName}</p>
                      <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: 0 }}>@{account.tenantSubdomain}</p>
                    </div>
                  </div>

                  {/* Platform */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: pm.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', color: pm.color }}>{pm.icon}</span>
                    </div>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: pm.color }}>{pm.label}</span>
                  </div>

                  {/* Account name */}
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {account.accountName || '—'}
                  </span>

                  {/* Pages */}
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    {account.pageCount > 0 ? (
                      <span style={{ fontWeight: 700, color: '#10b981' }}>{account.pageCount} page{account.pageCount !== 1 ? 's' : ''}</span>
                    ) : '—'}
                  </span>

                  {/* Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: account.isActive ? '#10b981' : '#f43f5e', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: account.isActive ? '#10b981' : '#f43f5e' }}>
                      {account.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {account.connectedAt && (
                      <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>
                        · {new Date(account.connectedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <PaginationControls
          currentPage={safePage}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemLabel="accounts"
        />
      </div>
    </div>
  )
}
