'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { getPayrollRuns, getSalarySlips, markSalaryPaid } from '@/actions/payroll'
import { generateSalarySlipPDF } from '@/lib/pdf-generator'
import PaginationControls from '@/components/ui/PaginationControls'

type Run = {
  id: string
  publicId: string
  month: number
  year: number
  totalAmount: number
  status: string
  processedBy: string | null
  metadata: any
  createdAt: Date
  entityCount: number
}

type Slip = {
  id: string
  publicId: string
  businessEntityId: string
  entityName: string
  entityType: string
  baseSalary: number
  allowances: number
  deductions: number
  netPay: number
  status: string
  taxBreakdown: { tds: number; pf: number; pt: number } | null
  createdAt: Date
}

const MONTHS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  COMPLETED:  { bg: 'rgba(16,185,129,0.12)',  color: '#10b981' },
  PROCESSING: { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b' },
  PENDING:    { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8' },
  FAILED:     { bg: 'rgba(244,63,94,0.12)',   color: '#f43f5e' },
  PAID:       { bg: 'rgba(16,185,129,0.12)',  color: '#10b981' },
}

function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.PENDING
  return (
    <span style={{
      fontSize: '0.6875rem', fontWeight: 700, padding: '0.2rem 0.55rem',
      borderRadius: 999, background: s.bg, color: s.color,
      letterSpacing: '0.02em', whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  )
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

type Props = {
  tenantId: string
  tenantName: string
}

export default function PayrollRunHistory({ tenantId, tenantName }: Props) {
  const [runs, setRuns] = useState<Run[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRun, setSelectedRun] = useState<Run | null>(null)
  const [slips, setSlips] = useState<Slip[]>([])
  const [slipsLoading, setSlipsLoading] = useState(false)
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [runsPage, setRunsPage] = useState(1)
  const [slipsPage, setSlipsPage] = useState(1)
  const runsPageSize = 8
  const slipsPageSize = 10

  const loadRuns = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getPayrollRuns(tenantId)
      setRuns(data as Run[])
      setRunsPage(1)
    } catch (_) {}
    setLoading(false)
  }, [tenantId])

  useEffect(() => { loadRuns() }, [loadRuns])

  async function openRun(run: Run) {
    setSelectedRun(run)
    setSlipsLoading(true)
    setSlipsPage(1)
    try {
      const data = await getSalarySlips(tenantId, run.publicId)
      setSlips(data as Slip[])
    } catch (_) {}
    setSlipsLoading(false)
  }

  async function handleMarkPaid(slip: Slip) {
    setMarkingId(slip.publicId)
    try {
      await markSalaryPaid(tenantId, slip.publicId)
      const updatedSlip = { ...slip, status: 'PAID' }
      setSlips(prev => prev.map(s => s.publicId === slip.publicId ? updatedSlip : s))
      if (selectedRun) {
        generateSalarySlipPDF(
          updatedSlip,
          { name: tenantName, subdomain: 'tenant' },
          `${MONTHS[selectedRun.month]} ${selectedRun.year}`
        )
      }
    } catch (_) {}
    setMarkingId(null)
  }

  const runType = (run: Run) => (run.metadata as any)?.type ?? 'SALARY'
  const totalRunPages = Math.max(1, Math.ceil(runs.length / runsPageSize))
  const safeRunsPage = Math.min(runsPage, totalRunPages)
  const paginatedRuns = runs.slice((safeRunsPage - 1) * runsPageSize, safeRunsPage * runsPageSize)
  const totalSlipPages = Math.max(1, Math.ceil(slips.length / slipsPageSize))
  const safeSlipsPage = Math.min(slipsPage, totalSlipPages)
  const paginatedSlips = slips.slice((safeSlipsPage - 1) * slipsPageSize, safeSlipsPage * slipsPageSize)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ color: '#00B077' }}>history</span>
            Payroll Run History
          </h3>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Tenant: <strong>{tenantName}</strong> — {runs.length} total runs
          </p>
        </div>
        <button
          onClick={loadRuns}
          disabled={loading}
          style={{ padding: '0.4rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>refresh</span>
        </button>
      </div>

      {/* Run Table */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading runs...</div>
        ) : runs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.75rem' }}>inbox</span>
            No payroll runs yet. Use the Payroll Engine tab to execute a cycle.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-raised)' }}>
                  {['Cycle', 'Type', 'Entities', 'Total Value', 'Status', 'Processed By', 'Date', 'Action'].map(h => (
                    <th key={h} style={{ padding: '0.875rem 1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedRuns.map(run => (
                  <tr
                    key={run.id}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: selectedRun?.id === run.id ? 'rgba(0,176,119,0.04)' : 'transparent',
                      transition: 'background 150ms',
                    }}
                  >
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {MONTHS[run.month]} {run.year}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 6, background: 'var(--bg-raised)', color: 'var(--text-secondary)' }}>
                        {runType(run)}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--text-secondary)' }}>{run.entityCount}</td>
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 800, color: '#10b981' }}>{fmt(run.totalAmount)}</td>
                    <td style={{ padding: '0.875rem 1rem' }}><StatusPill status={run.status} /></td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{run.processedBy ?? '—'}</td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {new Date(run.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <button
                        onClick={() => selectedRun?.id === run.id ? setSelectedRun(null) : openRun(run)}
                        style={{
                          padding: '0.3rem 0.65rem', borderRadius: 7, border: '1px solid var(--border)',
                          background: selectedRun?.id === run.id ? '#00B077' : 'var(--bg-raised)',
                          color: selectedRun?.id === run.id ? '#fff' : 'var(--text-secondary)',
                          cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem',
                        }}
                      >
                        {selectedRun?.id === run.id ? 'Close' : 'View Slips'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <PaginationControls
          currentPage={safeRunsPage}
          totalItems={runs.length}
          pageSize={runsPageSize}
          onPageChange={setRunsPage}
          itemLabel="runs"
        />
      </div>

      {/* Salary Slip Viewer */}
      {selectedRun && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid rgba(0,176,119,0.3)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'rgba(0,176,119,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h4 style={{ margin: 0, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="material-symbols-outlined" style={{ color: '#00B077', fontSize: '1.1rem' }}>receipt</span>
              Salary Slips — {MONTHS[selectedRun.month]} {selectedRun.year} ({runType(selectedRun)})
            </h4>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{slips.length} slips</span>
          </div>

          {slipsLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading slips...</div>
          ) : slips.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No slips found for this run.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-raised)' }}>
                    {['Entity', 'Type', 'Base Salary', 'Allowances', 'Deductions', 'Net Pay', 'Status', 'Action'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedSlips.map(slip => (
                    <tr key={slip.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{slip.entityName}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: 5, background: 'var(--bg-raised)', color: 'var(--text-muted)' }}>
                          {slip.entityType}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{fmt(slip.baseSalary)}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#10b981' }}>+{fmt(slip.allowances)}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#f43f5e' }}>
                        -{fmt(slip.deductions)}
                        {slip.taxBreakdown && (
                          <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            TDS:{fmt(slip.taxBreakdown.tds)} · PF:{fmt(slip.taxBreakdown.pf)}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 900, color: slip.netPay > 0 ? 'var(--text-primary)' : '#f43f5e' }}>{fmt(slip.netPay)}</td>
                      <td style={{ padding: '0.75rem 1rem' }}><StatusPill status={slip.status} /></td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {slip.status === 'PENDING' && (
                            <button
                              onClick={() => handleMarkPaid(slip)}
                              disabled={markingId === slip.publicId}
                              style={{
                                padding: '0.25rem 0.55rem', borderRadius: 6, border: 'none',
                                background: markingId === slip.publicId ? 'var(--bg-raised)' : 'rgba(16,185,129,0.12)',
                                color: '#10b981', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem',
                              }}
                            >
                              {markingId === slip.publicId ? '...' : 'Mark Paid'}
                            </button>
                          )}
                          <button
                            onClick={() => generateSalarySlipPDF(
                              slip,
                              { name: tenantName, subdomain: 'tenant' },
                              `${MONTHS[selectedRun.month]} ${selectedRun.year}`
                            )}
                            style={{
                              padding: '0.25rem 0.55rem',
                              borderRadius: 6,
                              border: '1px solid var(--border)',
                              background: 'var(--bg-raised)',
                              color: '#00B077',
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                            }}
                          >
                            PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <PaginationControls
                currentPage={safeSlipsPage}
                totalItems={slips.length}
                pageSize={slipsPageSize}
                onPageChange={setSlipsPage}
                itemLabel="slips"
              />
              {/* Summary row */}
              <div style={{ padding: '0.875rem 1rem', background: 'var(--bg-raised)', display: 'flex', gap: '2rem', borderTop: '2px solid var(--border)' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  Total Pay: <strong style={{ color: '#10b981' }}>{fmt(slips.reduce((a, s) => a + s.netPay, 0))}</strong>
                </span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  Total Deductions: <strong style={{ color: '#f43f5e' }}>{fmt(slips.reduce((a, s) => a + s.deductions, 0))}</strong>
                </span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  Paid: <strong style={{ color: '#10b981' }}>{slips.filter(s => s.status === 'PAID').length}</strong> / {slips.length}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
