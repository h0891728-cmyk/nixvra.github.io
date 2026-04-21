'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { getGlobalSocialAnalytics, type SocialDailyStat } from '@/actions/super-admin-social'
import { formatCompactNumber, formatCompactCurrency } from '@/lib/format'

interface TenantStat {
  tenantName: string
  tenantSubdomain: string
  totalPosts: number
  publishedPosts: number
  scheduledPosts: number
  totalCampaigns: number
  totalWhatsApp: number
}

type Range = 7 | 30

function StatCard({ label, value, sub, color, icon }: { label: string; value: string | number; sub?: string; color: string; icon: string }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.5rem' }}>{label}</p>
        <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color }}>{icon}</span>
      </div>
      <p style={{ fontSize: '1.875rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.375rem 0 0' }}>{sub}</p>}
    </div>
  )
}

// Tooltip component defined OUTSIDE render to avoid react-hooks/static-components lint error
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '0.875rem', borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.12)' }}>
      <p style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
        {label ? new Date(label).toLocaleDateString('en-IN', { weekday: 'short', month: 'long', day: 'numeric' }) : ''}
      </p>
      {payload.map((entry, i) => (
        <p key={i} style={{ margin: '0.25rem 0', fontWeight: 700, fontSize: '0.875rem', color: entry.color, display: 'flex', justifyContent: 'space-between', gap: '1.25rem' }}>
          <span>{entry.name}:</span>
          <span>{typeof entry.value === 'number' && entry.name.toLowerCase().includes('spend')
            ? formatCompactCurrency(entry.value)
            : formatCompactNumber(entry.value)
          }</span>
        </p>
      ))}
    </div>
  )
}

export default function GlobalAnalyticsDashboard() {
  const [data,     setData]     = useState<SocialDailyStat[]>([])
  const [tenStats, setTenStats] = useState<TenantStat[]>([])
  const [summary,  setSummary]  = useState<Record<string, number>>({})
  const [range,    setRange]    = useState<Range>(30)
  const [loading,  setLoading]  = useState(true)

  const load = useCallback(async (r: Range) => {
    setLoading(true)
    try {
      // Fetch analytics from API route for richer breakdown
      const res = await fetch(`/api/super-admin/social/analytics?days=${r}`)
      const json = await res.json()
      setData(json.daily || [])
      setTenStats(json.tenantStats || [])
      setSummary(json.summary || {})
    } catch {
      // Fallback to server action
      const fallback = await getGlobalSocialAnalytics(r)
      setData(fallback)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load(range) }, [load, range])

  const chartData = data.slice(-range)

  const formatXAxis = (tick: string) => {
    const d = new Date(tick)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: '#008E60' }}>monitoring</span>
          <div>
            <p style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>Global Analytics Dashboard</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Platform-wide social performance across all tenants</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-raised)', padding: '0.25rem', borderRadius: 10, border: '1px solid var(--border)' }}>
          {([7, 30] as Range[]).map(r => (
            <button key={r} onClick={() => { setRange(r); load(r) }} style={{ padding: '0.375rem 0.875rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', transition: 'all 200ms', background: range === r ? 'var(--bg-overlay)' : 'transparent', color: range === r ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              {r}D
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.875rem' }}>
        <StatCard label="Posts Created"   value={formatCompactNumber(summary.totalPostsCreated   || 0)} icon="edit_note"   color="#00B077" sub={`${range}d window`} />
        <StatCard label="Published"       value={formatCompactNumber(summary.totalPostsPublished || 0)} icon="publish"     color="#10b981" sub="Live on platforms" />
        <StatCard label="Scheduled"       value={formatCompactNumber(summary.totalPostsScheduled || 0)} icon="schedule"    color="#f59e0b" sub="Queued for publish" />
        <StatCard label="Failed"          value={formatCompactNumber(summary.totalPostsFailed    || 0)} icon="error"       color="#f43f5e" sub="Needs attention" />
        <StatCard label="Ad Impressions"  value={formatCompactNumber(summary.totalAdImpressions || 0)} icon="visibility"  color="#06b6d4" sub="Cross-platform" />
        <StatCard label="Ad Spend"        value={formatCompactCurrency(summary.totalAdSpend      || 0)} icon="payments"    color="#008E60" sub="Total attributed" />
        <StatCard label="WhatsApp Msgs"   value={formatCompactNumber(summary.totalWhatsAppMessages || 0)} icon="chat"    color="#25d366" sub="Outbound events" />
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem', opacity: 0.4 }}>bar_chart</span>
          Aggregating cross-tenant analytics...
        </div>
      ) : (
        <>
          {/* Charts Row 1 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,480px),1fr))', gap: '1.25rem' }}>
            {/* Posts Created + Published */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.25rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 1.25rem' }}>
                <span style={{ color: '#00B077', marginRight: 6 }}>●</span>Posts Created vs Published
              </p>
              <div style={{ width: '100%', height: 240 }}>
                <ResponsiveContainer>
                  <ComposedChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00B077" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#00B077" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="date" tickFormatter={formatXAxis} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} dy={10} minTickGap={5} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '0.8125rem', paddingTop: 10 }} />
                    <Area type="monotone" name="Posts Created" dataKey="postsCreated" stroke="#00B077" strokeWidth={3} fill="url(#gradCreated)" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Ad Impressions + Spend */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.25rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 1.25rem' }}>
                <span style={{ color: '#f59e0b', marginRight: 6 }}>●</span>Ad Impressions & Spend
              </p>
              <div style={{ width: '100%', height: 240 }}>
                <ResponsiveContainer>
                  <ComposedChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradImpr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="date" tickFormatter={formatXAxis} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} dy={10} minTickGap={5} />
                    <YAxis yAxisId="left" tickFormatter={v => formatCompactNumber(v)} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={v => formatCompactCurrency(v)} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={50} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '0.8125rem', paddingTop: 10 }} />
                    <Area yAxisId="left" type="monotone" name="Impressions" dataKey="adImpressions" stroke="#10b981" strokeWidth={3} fill="url(#gradImpr)" />
                    <Line yAxisId="right" type="monotone" name="Ad Spend" dataKey="adSpend" stroke="#f59e0b" strokeWidth={3} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Post Status Breakdown Bar Chart */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.25rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 1.25rem' }}>
              <span style={{ color: '#06b6d4', marginRight: 6 }}>●</span>Daily Post Activity Breakdown
            </p>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="date" tickFormatter={formatXAxis} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} dy={10} minTickGap={5} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--bg-raised)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '0.8125rem', paddingTop: 10 }} />
                  <Bar name="Posts Created" dataKey="postsCreated" fill="#00B077" radius={[4,4,0,0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Per-Tenant Breakdown Table */}
          {tenStats.length > 0 && (
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--text-primary)', margin: 0 }}>Tenant Performance Breakdown</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', padding: '0.625rem 1.5rem', background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
                {['Tenant','Posts','Published','Scheduled','Campaigns','WhatsApp'].map(h => (
                  <span key={h} style={{ fontSize: '0.6875rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
                ))}
              </div>
              {tenStats.sort((a, b) => b.totalPosts - a.totalPosts).map((t, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', margin: 0 }}>{t.tenantName}</p>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: 0 }}>@{t.tenantSubdomain}</p>
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>{t.totalPosts}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#10b981' }}>{t.publishedPosts}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f59e0b' }}>{t.scheduledPosts}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#06b6d4' }}>{t.totalCampaigns}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#25d366' }}>{t.totalWhatsApp}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
