'use client'

import React, { useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts'
import { DailyStat } from '@/actions/analytics'
import { formatCompactNumber, formatCompactCurrency } from '@/lib/format'

interface AnalyticsChartsProps {
  data: DailyStat[]
}

export default function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  const [timeRange, setTimeRange] = useState<365 | 30 | 7>(30)

  // Data comes pre-sorted oldest to newest. We just slice the end.
  const filteredData = data.slice(-timeRange)

  // Format date for X-Axis (e.g. "Oct 12")
  const formatXAxis = (tickItem: string) => {
    const d = new Date(tickItem)
    if (timeRange === 365) return d.toLocaleDateString('en-US', { month: 'short' })
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
            <p key={index} style={{ margin: '0.25rem 0', fontWeight: 700, fontSize: '0.875rem', color: entry.color, display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <span>{entry.name}:</span>
              <span>{entry.name === 'Revenue' ? formatCompactCurrency(entry.value) : formatCompactNumber(entry.value)}</span>
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
        <h2 style={{ fontSize: '1.0625rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
          Platform Analytics
        </h2>
        
        {/* Filters */}
        <div style={{ display: 'flex', background: 'var(--bg-raised)', padding: '0.25rem', borderRadius: 10, border: '1px solid var(--border)' }}>
          {([
            { label: '7D', value: 7 },
            { label: '30D', value: 30 },
            { label: '1Y', value: 365 }
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
        
        {/* REVENUE CHART */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', margin: '0 0 1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Revenue Collected (Cross-Tenant)
          </h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <AreaChart data={filteredData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatXAxis} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: 'var(--text-muted)' }} 
                  dy={10}
                  minTickGap={timeRange === 365 ? 30 : 5}
                />
                <YAxis 
                  tickFormatter={(val) => formatCompactCurrency(val)} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                  width={60}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" name="Revenue" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* WEBHOOK ACTIVITY CHART */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', margin: '0 0 1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Webhook Integrations Health
          </h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={filteredData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatXAxis} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: 'var(--text-muted)' }} 
                  dy={10}
                  minTickGap={timeRange === 365 ? 30 : 5}
                />
                <YAxis 
                  tickFormatter={(val) => formatCompactNumber(val)}
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-raised)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '0.8125rem' }} />
                <Bar name="Successful" dataKey="webhooksProcessed" stackId="a" fill="#00B077" radius={[0, 0, 4, 4]} />
                <Bar name="Failed" dataKey="webhooksFailed" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  )
}
