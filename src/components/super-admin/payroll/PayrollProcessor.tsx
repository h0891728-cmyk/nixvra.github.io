'use client'

import React, { useState } from 'react'
import { runTenantPayroll } from '@/actions/payroll'

type Tenant = { id: string; name: string; subdomain: string }

type Props = {
  tenantId: string
  tenants?: Tenant[]
}

const BILLING_TYPES = [
  {
    key: 'SALARY' as const,
    label: 'Payroll: Staff / Employees',
    desc: 'Calculates net salary with TDS, PF, PT deductions. Generates SalarySlips.',
    icon: 'account_balance_wallet',
    color: '#00B077',
    entities: 'STAFF, TEACHER, AGENT, VENDOR',
  },
  {
    key: 'FEES' as const,
    label: 'Receivables: Student / Patient Fees',
    desc: 'Creates fee invoices for students, patients & customers based on coreValue.',
    icon: 'school',
    color: '#f59e0b',
    entities: 'STUDENT, PATIENT, CUSTOMER',
  },
  {
    key: 'INVOICE' as const,
    label: 'Payables: B2B Vendor Billing',
    desc: 'Generates outgoing invoice records for vendors/agents. Due end-of-month.',
    icon: 'corporate_fare',
    color: '#008E60',
    entities: 'VENDOR, AGENT',
  },
]

const MONTHS = [
  { v: 1, l: 'January' }, { v: 2, l: 'February' }, { v: 3, l: 'March' },
  { v: 4, l: 'April' }, { v: 5, l: 'May' }, { v: 6, l: 'June' },
  { v: 7, l: 'July' }, { v: 8, l: 'August' }, { v: 9, l: 'September' },
  { v: 10, l: 'October' }, { v: 11, l: 'November' }, { v: 12, l: 'December' },
]

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

export default function PayrollProcessor({ tenantId, tenants = [] }: Props) {
  const [selectedTenantId, setSelectedTenantId] = useState(tenantId)
  const [billingType, setBillingType] = useState<'SALARY' | 'FEES' | 'INVOICE'>('SALARY')
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(currentYear)
  const [useAttendance, setUseAttendance] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ totalProcessed: number; totalAmount: number; runId: string } | null>(null)
  const [error, setError] = useState('')

  async function handleProcess() {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await runTenantPayroll(selectedTenantId, month, year, billingType, useAttendance)
      setResult(res)
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
      else setError('An unexpected error occurred')
    }
    setLoading(false)
  }

  const activeBT = BILLING_TYPES.find(b => b.key === billingType)!

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Billing Type Selector */}
      <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 16, border: '1px solid var(--border)' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="material-symbols-outlined" style={{ color: '#00B077' }}>category</span>
          Select Financial Cycle Type
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
          {BILLING_TYPES.map(bt => (
            <button
              key={bt.key}
              onClick={() => setBillingType(bt.key)}
              style={{
                padding: '1rem', borderRadius: 12,
                border: `2px solid ${billingType === bt.key ? bt.color : 'var(--border)'}`,
                background: billingType === bt.key ? `${bt.color}10` : 'var(--bg-raised)',
                cursor: 'pointer', textAlign: 'left', transition: 'all 200ms',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ color: bt.color, fontSize: '1.1rem' }}>{bt.icon}</span>
                <span style={{ fontWeight: 800, color: billingType === bt.key ? bt.color : 'var(--text-primary)', fontSize: '0.875rem' }}>
                  {bt.key}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{bt.label}</p>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Entities: {bt.entities}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Configuration */}
      <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 16, border: '1px solid var(--border)' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="material-symbols-outlined" style={{ color: '#f59e0b' }}>tune</span>
          Cycle Configuration
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>

          {/* Tenant Selector */}
          {tenants.length > 0 && (
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.375rem', textTransform: 'uppercase' }}>
                Target Tenant
              </label>
              <select
                value={selectedTenantId}
                onChange={e => setSelectedTenantId(e.target.value)}
                className="form-input"
              >
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.subdomain})</option>
                ))}
              </select>
            </div>
          )}

          {/* Month */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.375rem', textTransform: 'uppercase' }}>
              Month
            </label>
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className="form-input">
              {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
          </div>

          {/* Year */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.375rem', textTransform: 'uppercase' }}>
              Year
            </label>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="form-input">
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Attendance toggle (only for SALARY) */}
          {billingType === 'SALARY' && (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.375rem', textTransform: 'uppercase' }}>
                Attendance Proration
              </label>
              <button
                onClick={() => setUseAttendance(v => !v)}
                style={{
                  padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid var(--border)',
                  background: useAttendance ? 'rgba(16,185,129,0.12)' : 'var(--bg-raised)',
                  color: useAttendance ? '#10b981' : 'var(--text-muted)',
                  cursor: 'pointer', fontWeight: 700, fontSize: '0.8125rem',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                  {useAttendance ? 'check_circle' : 'radio_button_unchecked'}
                </span>
                {useAttendance ? 'Enabled (Prorated)' : 'Disabled (Full Pay)'}
              </button>
            </div>
          )}
        </div>

        {/* Info Banner */}
        <div style={{
          marginTop: '1.25rem', padding: '0.875rem 1rem', borderRadius: 10,
          background: `${activeBT.color}08`, border: `1px solid ${activeBT.color}30`,
        }}>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <strong style={{ color: activeBT.color }}>{activeBT.label}:</strong>{' '}
            {activeBT.desc}
            {billingType === 'SALARY' && useAttendance && (
              <> Salary will be prorated based on <strong>AttendanceLogs</strong> — entities without logs receive full pay.</>
            )}
          </p>
        </div>
      </div>

      {/* Execute Panel */}
      <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 16, border: '1px solid var(--border)' }}>
        {error && (
          <div style={{ padding: '1rem', background: 'rgba(244,63,94,0.08)', color: '#f43f5e', borderRadius: 10, marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: 6 }}>error</span>
            {error}
          </div>
        )}

        {result ? (
          <div style={{ padding: '1.5rem', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
              <span className="material-symbols-outlined" style={{ color: '#10b981', fontSize: '1.5rem' }}>check_circle</span>
              <h4 style={{ margin: 0, color: '#10b981', fontWeight: 800 }}>Cycle Executed Successfully</h4>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
              {[
                { label: 'Entities Processed', value: result.totalProcessed },
                { label: 'Total Value', value: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(result.totalAmount) },
                { label: 'Run ID', value: result.runId.slice(0, 13) + '...' },
              ].map(k => (
                <div key={k.label} style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 8 }}>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{k.label}</p>
                  <p style={{ margin: '0.25rem 0 0', fontWeight: 900, color: 'var(--text-primary)', fontSize: '1.1rem' }}>{k.value}</p>
                </div>
              ))}
            </div>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              View generated records in the <strong>Run History</strong> or <strong>ERP Invoices</strong> tabs.
            </p>
            <button
              onClick={() => setResult(null)}
              style={{ marginTop: '0.875rem', padding: '0.4rem 0.875rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600, fontSize: '0.8125rem' }}
            >
              Run Another Cycle
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                Ready to execute: <span style={{ color: activeBT.color }}>{billingType}</span> cycle
              </p>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                {MONTHS.find(m => m.v === month)?.l} {year}
                {billingType === 'SALARY' && ` · Attendance: ${useAttendance ? 'prorated' : 'full pay'}`}
              </p>
            </div>
            <button
              onClick={handleProcess}
              disabled={loading}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.625rem 1.25rem', borderRadius: 10 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>
                {loading ? 'autorenew' : 'play_circle'}
              </span>
              {loading ? 'Processing Cycle...' : `Execute ${billingType} Cycle`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
