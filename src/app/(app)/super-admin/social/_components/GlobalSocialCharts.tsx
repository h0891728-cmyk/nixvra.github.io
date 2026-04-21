'use client'

import React, { useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, ComposedChart, Line
} from 'recharts'
import { SocialDailyStat } from '@/actions/super-admin-social'
import { formatCompactNumber, formatCompactCurrency } from '@/lib/format'

interface GlobalSocialChartsProps {
  data: SocialDailyStat[]
}

export default function GlobalSocialCharts({ data }: GlobalSocialChartsProps) {
  const [timeRange, setTimeRange] = useState<30 | 7>(30)

  const filteredData = data.slice(-timeRange)

  const formatXAxis = (tickItem: string) => {
    const d = new Date(tickItem)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          padding: '0.875rem', borderRadius: 12, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            {new Date(label).toLocaleDateString('en-IN', { weekday: 'short', month: 'long', day: 'numeric' })}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ margin: '0.25rem 0', fontWeight: 700, fontSize: '0.875rem', color: entry.color, display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
              <span>{entry.name}:</span>
              <span>{entry.name === 'Ad Spend' ? formatCompactCurrency(entry.value) : formatCompactNumber(entry.value)}</span>
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.0625rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="material-symbols-outlined" style={{ color: '#008E60', fontSize: '1.25rem' }}>monitoring</span>
          Global Analytical Network
        </h2>
        
        <div style={{ display: 'flex', background: 'var(--bg-raised)', padding: '0.25rem', borderRadius: 10, border: '1px solid var(--border)' }}>
          {([
            { label: '7D', value: 7 },
            { label: '30D', value: 30 }
          ] as const).map(t => (
            <button
              key={t.value}
              onClick={() => setTimeRange(t.value)}
              style={{
                padding: '0.375rem 0.75rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: '0.75rem', transition: 'all 200ms',
                background: timeRange === t.value ? 'var(--bg-overlay)' : 'transparent',
                color: timeRange === t.value ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: timeRange === t.value ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 500px), 1fr))', gap: '1.25rem' }}>
        
        {/* CROSS-TENANT AD PERFORMANCE */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-muted)', margin: '0 0 1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span style={{ color: '#f59e0b', marginRight: 6 }}>●</span>
            Ad Impressions & Spend (Platform-Wide)
          </h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <ComposedChart data={filteredData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorImpression" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="date" tickFormatter={formatXAxis} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} dy={10} minTickGap={5} />
                <YAxis yAxisId="left" tickFormatter={(val) => formatCompactNumber(val)} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(val) => formatCompactCurrency(val)} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={40} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '0.8125rem', paddingTop: '10px' }} />
                <Area yAxisId="left" type="monotone" name="Ad Impressions" dataKey="adImpressions" stroke="#10b981" strokeWidth={3} fill="url(#colorImpression)" />
                <Line yAxisId="right" type="monotone" name="Ad Spend" dataKey="adSpend" stroke="#f59e0b" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ORGANIC SOCIAL POSTING */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-muted)', margin: '0 0 1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span style={{ color: '#06b6d4', marginRight: 6 }}>●</span>
            Organic Posts Created
          </h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={filteredData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                   <linearGradient id="colorPost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="date" tickFormatter={formatXAxis} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} dy={10} minTickGap={5} />
                <YAxis tickFormatter={(val) => formatCompactNumber(val)} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-raised)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '0.8125rem', paddingTop: '10px' }} />
                <Bar name="New Posts" dataKey="postsCreated" fill="url(#colorPost)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  )
}
