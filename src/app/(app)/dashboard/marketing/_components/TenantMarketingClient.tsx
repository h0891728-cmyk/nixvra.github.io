'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { getTenantSocialAnalytics } from '@/actions/tenant-marketing'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { formatCompactNumber, formatCompactCurrency } from '@/lib/format'

export default function TenantMarketingClient() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await getTenantSocialAnalytics()
    setData(res)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading || !data) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Synchronizing Local Ad Networks...</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.75rem', color: '#008E60' }}>campaign</span>
            MarketHun (Local Core)
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
            Unified isolated Marketing Engine orchestrating Posts and Ad Campaigns exclusively for your Database.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '1.5rem', borderRadius: 16 }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Posts Made</p>
          <h3 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)' }}>{data.totals.posts}</h3>
        </div>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '1.5rem', borderRadius: 16 }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Ad Campaigns</p>
          <h3 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: '#3b82f6' }}>{data.totals.campaigns}</h3>
        </div>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '1.5rem', borderRadius: 16 }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Local Ads Spend</p>
          <h3 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: '#f43f5e' }}>{formatCompactCurrency(data.totals.spend)}</h3>
        </div>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '1.5rem', borderRadius: 16 }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Impressions</p>
          <h3 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: '#10b981' }}>{formatCompactNumber(data.totals.impressions)}</h3>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 1rem' }}>Local Ads Traction (14D)</h3>
          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.timeline}>
                <defs>
                  <linearGradient id="colorAds" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#008E60" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#008E60" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <Tooltip contentStyle={{ background: 'var(--bg-raised)', border: 'none', borderRadius: 8 }} />
                <Area type="monotone" dataKey="adsRunning" stroke="#008E60" strokeWidth={3} fillOpacity={1} fill="url(#colorAds)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 1rem' }}>Content Delivery Trajectory</h3>
          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.timeline}>
                <XAxis dataKey="date" hide />
                <Tooltip contentStyle={{ background: 'var(--bg-raised)', border: 'none', borderRadius: 8 }} />
                <Line type="monotone" dataKey="posts" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
