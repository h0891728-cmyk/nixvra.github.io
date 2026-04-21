'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { getGlobalTransactions, getGlobalFinancialAnalytics, FinancialDailyStat } from '@/actions/super-admin-finance'
import { formatCompactNumber, formatCompactCurrency } from '@/lib/format'
import PaginationControls from '@/components/ui/PaginationControls'
import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  PAID:     { bg: 'rgba(16,185,129,0.12)',  color: '#10b981', label: 'Paid' },
  PENDING:  { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b', label: 'Pending' },
  FAILED:   { bg: 'rgba(244,63,94,0.12)',   color: '#f43f5e', label: 'Failed' },
  REFUNDED: { bg: 'rgba(0,176,119,0.12)',  color: '#00B077', label: 'Refunded' },
}

function StatusPill({ status }: { status: string }) {
  const pill = STATUS_COLORS[status] || { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8', label: status }
  return (
    <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: 999, background: pill.bg, color: pill.color, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
      {pill.label}
    </span>
  )
}

function TenantBadge({ tenant }: { tenant: { name: string; subdomain: string } }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-overlay)', padding: '0.2rem 0.5rem', borderRadius: 8, border: '1px solid var(--border)', width: 'fit-content' }}>
      <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', color: '#008E60' }}>corporate_fare</span>
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{tenant.name}</span>
      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>({tenant.subdomain})</span>
    </div>
  )
}

export default function GlobalTransactionsClient() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<FinancialDailyStat[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<30 | 7>(30)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 12

  const load = useCallback(async () => {
    setLoading(true)
    const [txs, stats] = await Promise.all([
      getGlobalTransactions(50),
      getGlobalFinancialAnalytics(30)
    ])
    setTransactions(txs)
    setAnalytics(stats)
    setCurrentPage(1)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filteredStats = analytics.slice(-timeRange)
  const totalPages = Math.max(1, Math.ceil(transactions.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedTransactions = transactions.slice((safePage - 1) * pageSize, safePage * pageSize)
  const totalVolume = filteredStats.reduce((acc, curr) => acc + curr.grossVolume, 0)
  const totalSuccess = filteredStats.reduce((acc, curr) => acc + curr.successCount, 0)
  const totalFailed = filteredStats.reduce((acc, curr) => acc + curr.failedCount, 0)
  const totalTxs = totalSuccess + totalFailed
  const successRate = totalTxs > 0 ? Math.round((totalSuccess / totalTxs) * 100) : 0

  const formatXAxis = (tickItem: string) => {
    const d = new Date(tickItem)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '0.875rem', borderRadius: 12, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            {new Date(label).toLocaleDateString('en-IN', { weekday: 'short', month: 'long', day: 'numeric' })}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ margin: '0.25rem 0', fontWeight: 700, fontSize: '0.875rem', color: entry.color, display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
              <span>{entry.name}:</span>
              <span>{entry.name.includes('Volume') ? formatCompactCurrency(entry.value) : formatCompactNumber(entry.value)}</span>
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.75rem', color: '#008E60' }}>account_balance</span>
            Financial Command Center
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
            Real-time monitoring of all global transactions and processed volume across active tenants.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', background: 'var(--bg-raised)', padding: '0.25rem', borderRadius: 10, border: '1px solid var(--border)' }}>
            {([7, 30] as const).map(days => (
              <button
                key={days} onClick={() => setTimeRange(days)}
                style={{ padding: '0.375rem 0.75rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem', transition: 'all 200ms', background: timeRange === days ? 'var(--bg-overlay)' : 'transparent', color: timeRange === days ? 'var(--text-primary)' : 'var(--text-muted)', boxShadow: timeRange === days ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
              >
                {days}D
              </button>
            ))}
          </div>
          <button onClick={() => load()} disabled={loading} style={{ padding: '0.45rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>refresh</span>
          </button>
        </div>
      </div>

       {/* KPIs */}
       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
         <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.25rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', margin: '0 0 0.5rem', textTransform: 'uppercase' }}>Gross Volume Processed</p>
            <p style={{ fontSize: '1.75rem', fontWeight: 900, color: '#10b981', margin: 0 }}>{formatCompactCurrency(totalVolume)}</p>
         </div>
         <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.25rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', margin: '0 0 0.5rem', textTransform: 'uppercase' }}>Network Success Rate</p>
            <p style={{ fontSize: '1.75rem', fontWeight: 900, color: successRate > 90 ? '#10b981' : successRate > 75 ? '#f59e0b' : '#f43f5e', margin: 0 }}>{successRate}%</p>
         </div>
         <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.25rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', margin: '0 0 0.5rem', textTransform: 'uppercase' }}>Total Processed Txs</p>
            <p style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>{formatCompactNumber(totalSuccess)}</p>
         </div>
         <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.25rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', margin: '0 0 0.5rem', textTransform: 'uppercase' }}>Total Failed Txs</p>
            <p style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f43f5e', margin: 0 }}>{formatCompactNumber(totalFailed)}</p>
         </div>
       </div>

      {/* CHARTS */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem', marginBottom: '1.25rem' }}>
         <h3 style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-muted)', margin: '0 0 1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span style={{ color: '#008E60', marginRight: 6 }}>●</span>
            Platform Financial Volume over time
        </h3>
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer>
            <ComposedChart data={filteredStats} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
               <defs>
                <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="date" tickFormatter={formatXAxis} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} dy={10} minTickGap={5} />
               <YAxis tickFormatter={(val) => formatCompactCurrency(val)} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
               <Tooltip content={<CustomTooltip />} />
               <Legend iconType="circle" wrapperStyle={{ fontSize: '0.8125rem', paddingTop: '10px' }} />
               <Area type="monotone" name="Gross Volume" dataKey="grossVolume" stroke="#10b981" strokeWidth={3} fill="url(#colorVolume)" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

       {/* LEDGER GRID */}
       <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Global Ledger</h3>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>Showing last 50 network records</span>
          </div>
          {loading ? (
             <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading network ledger...</div>
          ) : transactions.length === 0 ? (
             <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No transactions recorded.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-raised)' }}>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Transaction ID</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Amount</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tenant Origin</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gateway</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransactions.map(t => (
                    <tr key={`${t.tenant.id}-${t.publicId}`} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{t.publicId.slice(0, 13)}...</td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(t.amount)}
                      </td>
                      <td style={{ padding: '1rem' }}><TenantBadge tenant={t.tenant} /></td>
                      <td style={{ padding: '1rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                         <span style={{ padding: '0.2rem 0.5rem', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 6, fontWeight: 700 }}>{t.paymentGateway}</span>
                      </td>
                      <td style={{ padding: '1rem' }}><StatusPill status={t.status} /></td>
                      <td style={{ padding: '1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{new Date(t.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <PaginationControls
            currentPage={safePage}
            totalItems={transactions.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            itemLabel="transactions"
          />
       </div>

    </div>
  )
}
