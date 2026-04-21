'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, AreaChart, Area, Cell,
} from 'recharts'
import { formatCompactNumber, formatCompactCurrency } from '@/lib/format'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

type MonthlyDataPoint = { month: string; revenue: number; transactions: number }
type StatusDataPoint = { name: string; value: number; color: string }

interface TenantChartsProps {
  monthlyData: MonthlyDataPoint[]
  statusData: StatusDataPoint[]
  totalRevenue: number
  totalTransactions: number
}

const customTooltipStyle = {
  background: '#1a1a27',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  color: '#f0f0fa',
  fontSize: '0.8125rem',
  padding: '0.5rem 0.875rem',
}

export default function TenantCharts({ monthlyData, statusData, totalRevenue, totalTransactions }: TenantChartsProps) {
  return (
    <div className="row g-4">
      {/* Revenue Bar Chart */}
      <div className="col-12 col-lg-7">
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '1.5rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Monthly Revenue</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                {formatCompactCurrency(totalRevenue)} total collected
              </p>
            </div>
            <span style={{
              padding: '0.25rem 0.75rem', borderRadius: 999,
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
              color: '#10b981', fontSize: '0.75rem', fontWeight: 600,
            }}>PAID</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#5e5e80', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#5e5e80', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => formatCompactCurrency(v)} />
              <Tooltip contentStyle={customTooltipStyle} formatter={(v: any) => [formatCompactCurrency(Number(v)), 'Revenue']} />
              <Bar dataKey="revenue" fill="#00B077" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Transaction Status Donut */}
      <div className="col-12 col-lg-5">
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '1.5rem', height: '100%',
        }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            Transaction Breakdown
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            {formatCompactNumber(totalTransactions)} total transactions
          </p>
          {statusData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>📊</p>
              <p>No transactions yet</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {statusData.map(s => (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{s.name}</span>
                    <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{formatCompactNumber(s.value)}</span>
                    <div style={{
                      width: 80, height: 6, borderRadius: 999,
                      background: 'var(--bg-raised)', overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%', borderRadius: 999, background: s.color,
                        width: `${Math.round((s.value / totalTransactions) * 100)}%`,
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Monthly Transaction Line */}
      <div className="col-12">
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '1.5rem',
        }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            Transaction Volume
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Number of transactions per month
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={monthlyData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="txGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#008E60" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#008E60" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#5e5e80', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#5e5e80', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => formatCompactNumber(v)} />
              <Tooltip contentStyle={customTooltipStyle} formatter={(v: any) => [formatCompactNumber(v), 'Transactions']} />
              <Area type="monotone" dataKey="transactions" stroke="#008E60" fill="url(#txGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
