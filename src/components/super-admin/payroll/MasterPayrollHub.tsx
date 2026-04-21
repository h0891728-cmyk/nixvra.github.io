'use client'

import React, { useState } from 'react'
import PayrollProcessor from './PayrollProcessor'
import PaymentGatewayManager from './PaymentGatewayManager'
import TaxConfigurationPanel from './TaxConfigurationPanel'
import InvoiceListViewer from './InvoiceListViewer'
import PayrollRunHistory from './PayrollRunHistory'
import { upsertTaxConfiguration, togglePaymentGateway } from '@/actions/payroll'

type Tab = 'overview' | 'processor' | 'invoices' | 'tax' | 'gateways' | 'runs'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'overview',   label: 'Global Overview',    icon: 'query_stats' },
  { key: 'processor',  label: 'Payroll Engine',     icon: 'account_balance_wallet' },
  { key: 'runs',       label: 'Run History',        icon: 'history' },
  { key: 'invoices',   label: 'ERP Invoices',       icon: 'receipt_long' },
  { key: 'tax',        label: 'Tax Compliance',     icon: 'account_balance' },
  { key: 'gateways',   label: 'Gateways (Payout)',  icon: 'credit_card' },
]

type Tenant = { id: string; name: string; subdomain: string }

type Props = {
  hqTenantId: string
  hqTenantName: string
  hqEntities: { id: string; name: string }[]
  hqTaxes: { taxType: string; rate: number; isActive: boolean }[]
  hqGateways: { provider: string; isActive: boolean; hasKey: boolean }[]
  tenants: Tenant[]
  globalData: {
    totalPayrollValue: number
    totalInvoicesValue: number
    activePayrollRuns: number
    rows: { tenant: string; totalRuns: number; value: number; pendingInvoices: number }[]
  }
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

export default function MasterPayrollHub({
  hqTenantId,
  hqTenantName,
  hqEntities,
  hqTaxes,
  hqGateways,
  tenants,
  globalData,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  // For run history + invoice list, allow selecting a different tenant
  const [selectedTenantId, setSelectedTenantId] = useState(hqTenantId)
  const selectedTenant = tenants.find(t => t.id === selectedTenantId) ?? { id: hqTenantId, name: hqTenantName, subdomain: '' }

  async function handleToggleGateway(provider: string, isActive: boolean) {
    await togglePaymentGateway(hqTenantId, provider, isActive)
  }

  async function handleToggleTax(taxType: string, rate: number, isActive: boolean) {
    await upsertTaxConfiguration(hqTenantId, taxType, rate, isActive)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── Tab Nav ── */}
      <div style={{
        display: 'flex', gap: '0.25rem', background: 'var(--bg-raised)',
        padding: '0.3rem', borderRadius: 12, border: '1px solid var(--border)',
        overflowX: 'auto', flexWrap: 'nowrap',
      }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '0.5rem 1rem', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.8125rem', transition: 'all 200ms', whiteSpace: 'nowrap',
              background: activeTab === t.key ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: activeTab === t.key ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tenant Selector (shown on runs + invoices tabs) */}
      {(activeTab === 'runs' || activeTab === 'invoices') && tenants.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <span className="material-symbols-outlined" style={{ color: '#008E60', fontSize: '1.1rem' }}>corporate_fare</span>
          <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Viewing Tenant:</label>
          <select
            value={selectedTenantId}
            onChange={e => setSelectedTenantId(e.target.value)}
            className="form-input"
            style={{ flex: 1, maxWidth: 300 }}
          >
            {tenants.map(t => <option key={t.id} value={t.id}>{t.name} ({t.subdomain})</option>)}
          </select>
        </div>
      )}

      {/* ── Overview Tab ── */}
      {activeTab === 'overview' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.875rem' }}>
            {[
              { label: 'Total Payroll Processed', value: fmt(globalData.totalPayrollValue), color: '#00B077', icon: 'payments' },
              { label: 'Pending Invoice Value', value: fmt(globalData.totalInvoicesValue), color: '#f59e0b', icon: 'receipt_long' },
              { label: 'Total Payroll Runs', value: globalData.activePayrollRuns, color: '#10b981', icon: 'history' },
              { label: 'Active Tenants', value: globalData.rows.length, color: '#008E60', icon: 'corporate_fare' },
            ].map(k => (
              <div key={k.label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase' }}>{k.label}</p>
                  <span className="material-symbols-outlined" style={{ color: k.color, fontSize: '1.1rem' }}>{k.icon}</span>
                </div>
                <p style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>{k.value}</p>
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 16, border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem', fontWeight: 800 }}>
              Tenant Billing Health
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginLeft: '0.5rem' }}>({globalData.rows.length} tenants)</span>
            </h3>
            {globalData.rows.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No payroll data yet across any tenant.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
                    {['Tenant', 'Pay Cycles', 'Total Processed', 'Pending Invoices'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {globalData.rows.map(r => (
                    <tr key={r.tenant} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{r.tenant}</td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{r.totalRuns}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#10b981' }}>{fmt(r.value)}</td>
                      <td style={{ padding: '0.75rem 1rem', color: r.pendingInvoices > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                        {r.pendingInvoices}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ── Payroll Engine ── */}
      {activeTab === 'processor' && (
        <PayrollProcessor tenantId={hqTenantId} tenants={tenants} />
      )}

      {/* ── Run History ── */}
      {activeTab === 'runs' && (
        <PayrollRunHistory tenantId={selectedTenantId} tenantName={selectedTenant.name} />
      )}

      {/* ── ERP Invoices ── */}
      {activeTab === 'invoices' && (
        <InvoiceListViewer
          tenantId={selectedTenantId}
          entities={hqEntities}
          tenantName={selectedTenant.name}
          tenantSubdomain={selectedTenant.subdomain}
        />
      )}

      {/* ── Tax Compliance ── */}
      {activeTab === 'tax' && (
        <TaxConfigurationPanel activeTaxes={hqTaxes} onUpdate={handleToggleTax} />
      )}

      {/* ── Gateways ── */}
      {activeTab === 'gateways' && (
        <PaymentGatewayManager gateways={hqGateways} onToggle={handleToggleGateway} />
      )}
    </div>
  )
}
