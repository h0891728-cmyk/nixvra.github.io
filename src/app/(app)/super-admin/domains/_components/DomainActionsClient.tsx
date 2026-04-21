'use client'

import { useState, useTransition } from 'react'
import {
  approveDomainAction,
  rejectDomainAction,
  verifyDomainDnsAction,
  removeDomainAction,
  syncVercelStatusAction,
} from '@/actions/domain'
import { GlobeIcon, CheckIcon, ClockIcon, TrashIcon, SearchIcon, RefreshIcon, CrossIcon, ActivityIcon, LockIcon, UnlockIcon, StarIcon, BlockIcon } from '@/components/icons'

// ── TYPES ─────────────────────────────────────────────────────────────────────

type DnsRecord = { type: string; name: string; value: string }

type DomainRow = {
  id: string
  domain: string
  type: string
  status: string
  source: string
  autoConfigured: boolean
  registrar: string | null
  namecomOrderId: string | null
  expiresAt: string | null
  verifyToken: string
  dnsTarget: string
  sslStatus: string
  approvedAt: string | null
  verifiedAt: string | null
  rejectedAt: string | null
  rejectionReason: string | null
  createdAt: string
  tenant: { id: string; name: string; subdomain: string }
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: any }> = {
  PENDING_APPROVAL: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Pending Approval', icon: ClockIcon },
  APPROVED: { color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', label: 'Approved — Awaiting DNS', icon: CheckIcon },
  VERIFYING: { color: '#008E60', bg: 'rgba(0,142,96,0.1)', label: 'Verifying DNS', icon: RefreshIcon },
  ACTIVE: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: 'Active', icon: GlobeIcon },
  FAILED: { color: '#f43f5e', bg: 'rgba(244,63,94,0.1)', label: 'DNS Failed', icon: CrossIcon },
  REJECTED: { color: '#5a5a78', bg: 'rgba(90,90,120,0.1)', label: 'Rejected', icon: BlockIcon },
}

// ── EXPANDED DNS PANEL ────────────────────────────────────────────────────────

function DnsPanel({ records, verifyToken }: { records: DnsRecord[]; verifyToken: string }) {
  if (records.length === 0) {
    return (
      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
        No specific records returned from Vercel. Use standard CNAME → <code style={{ color: '#818cf8' }}>cname.vercel-dns.com</code>
      </p>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {records.map((r, i) => (
        <div key={i} style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '70px 1fr 1fr',
            padding: '0.375rem 0.875rem',
            background: 'var(--bg-overlay)', borderBottom: '1px solid var(--border)',
            fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em',
            color: 'var(--text-muted)', textTransform: 'uppercase',
          }}>
            <span>Type</span><span>Name</span><span>Value</span>
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: '70px 1fr 1fr',
            padding: '0.625rem 0.875rem', gap: '1rem',
          }}>
            <code style={{ fontSize: '0.8125rem', color: '#f59e0b', fontFamily: 'monospace' }}>{r.type}</code>
            <code style={{ fontSize: '0.8125rem', color: '#818cf8', fontFamily: 'monospace' }}>{r.name}</code>
            <code
              style={{ fontSize: '0.8125rem', color: '#818cf8', fontFamily: 'monospace', cursor: 'pointer', overflowWrap: 'anywhere' }}
              onClick={() => navigator.clipboard.writeText(r.value)}
              title="Click to copy"
            >{r.value}</code>
          </div>
        </div>
      ))}
      {verifyToken && (
        <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{
            padding: '0.375rem 0.875rem', background: 'var(--bg-overlay)',
            borderBottom: '1px solid var(--border)',
            fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-muted)',
          }}>
            TXT — Ownership Verification (Alternative)
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: '70px 1fr 1fr',
            padding: '0.625rem 0.875rem', gap: '1rem',
          }}>
            <code style={{ fontSize: '0.8125rem', color: '#f59e0b', fontFamily: 'monospace' }}>TXT</code>
            <code style={{ fontSize: '0.8125rem', color: '#818cf8', fontFamily: 'monospace' }}>@</code>
            <code
              style={{ fontSize: '0.8125rem', color: '#818cf8', fontFamily: 'monospace', cursor: 'pointer', overflowWrap: 'anywhere' }}
              onClick={() => navigator.clipboard.writeText(verifyToken)}
              title="Click to copy"
            >{verifyToken}</code>
          </div>
        </div>
      )}
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
        💡 Click any value to copy • DNS propagation: up to 48h • Then click "Check DNS" to verify
      </p>
    </div>
  )
}

// ── MAIN CLIENT COMPONENT ──────────────────────────────────────────────────────
// This wraps the domain table with all interactive actions

interface DomainActionsClientProps {
  initialDomains: DomainRow[]
}

export default function DomainActionsClient({ initialDomains }: DomainActionsClientProps) {
  const [domains, setDomains] = useState<DomainRow[]>(initialDomains)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [verifyResults, setVerifyResults] = useState<Record<string, any>>({})
  const [vercelRecords, setVercelRecords] = useState<Record<string, DnsRecord[]>>({})
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [, startTransition] = useTransition()

  async function handleApprove(d: DomainRow) {
    setActionLoading(d.id + '_approve')
    const result = await approveDomainAction(d.id)
    setDomains(prev => prev.map(x => x.id === d.id ? { ...x, status: 'APPROVED', approvedAt: new Date().toISOString() } : x))
    if (result?.requiredRecords?.length) {
      setVercelRecords(prev => ({ ...prev, [d.id]: result.requiredRecords }))
      setExpandedId(d.id)
    }
    setActionLoading(null)
  }

  async function handleReject(d: DomainRow) {
    setActionLoading(d.id + '_reject')
    await rejectDomainAction(d.id, rejectReason)
    setDomains(prev => prev.map(x => x.id === d.id ? { ...x, status: 'REJECTED', rejectedAt: new Date().toISOString(), rejectionReason: rejectReason } : x))
    setRejectId(null)
    setRejectReason('')
    setActionLoading(null)
  }

  async function handleVerify(d: DomainRow) {
    setActionLoading(d.id + '_verify')
    const result = await verifyDomainDnsAction(d.id)
    setVerifyResults(prev => ({ ...prev, [d.id]: result }))
    setDomains(prev => prev.map(x => x.id === d.id ? {
      ...x,
      status: result.verified ? 'ACTIVE' : 'FAILED',
      sslStatus: result.verified ? 'ACTIVE' : 'PENDING',
      verifiedAt: result.verified ? new Date().toISOString() : null,
    } : x))
    setActionLoading(null)
  }

  async function handleSyncVercel(d: DomainRow) {
    setActionLoading(d.id + '_sync')
    const result = await syncVercelStatusAction(d.id)
    if (result.success && result.requiredRecords?.length) {
      setVercelRecords(prev => ({ ...prev, [d.id]: result.requiredRecords! }))
    }
    setExpandedId(d.id)
    setActionLoading(null)
  }

  async function handleRemove(d: DomainRow) {
    if (!confirm(`Remove "${d.domain}"? This will also remove it from Vercel.`)) return
    await removeDomainAction(d.id, d.tenant.id)
    setDomains(prev => prev.filter(x => x.id !== d.id))
  }

  const btnStyle = (variant: 'approve' | 'reject' | 'verify' | 'ghost' | 'danger') => {
    const base = {
      padding: '0.4375rem 0.875rem', borderRadius: 8, border: 'none',
      fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: '0.375rem',
    }
    const variants = {
      approve: { background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' },
      reject: { background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.3)', color: '#f43f5e' },
      verify: { background: 'rgba(0,176,119,0.15)', border: '1px solid rgba(0,176,119,0.3)', color: '#818cf8' },
      ghost: { background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)' },
      danger: { background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', marginLeft: 'auto' },
    }
    return { ...base, ...variants[variant] }
  }

  if (domains.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
        <GlobeIcon style={{ width: 36, height: 36, opacity: 0.3, marginBottom: '0.75rem' }} />
        <p>No domains in this category.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {domains.map((d, i) => {
        const cfg = STATUS_CONFIG[d.status] ?? STATUS_CONFIG.PENDING_APPROVAL
        const isExpanded = expandedId === d.id
        const isLastRow = i === domains.length - 1

        return (
          <div key={d.id} style={{ borderBottom: !isLastRow ? '1px solid var(--border)' : 'none' }}>
            {/* Row */}
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 130px',
              padding: '0.875rem 1.25rem', alignItems: 'center', gap: '0.5rem',
              transition: 'background 150ms',
            }}>
              {/* Domain + SSL + Source badge */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {d.sslStatus === 'ACTIVE'
                    ? <LockIcon style={{ width: 13, height: 13, color: '#10b981', flexShrink: 0 }} />
                    : <UnlockIcon style={{ width: 13, height: 13, color: '#f59e0b', flexShrink: 0 }} />
                  }
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                    {d.domain}
                  </span>
                  {d.type === 'PRIMARY' && (
                    <span style={{ padding: '0.1rem 0.45rem', borderRadius: 999, fontSize: '0.6rem', fontWeight: 700, background: 'rgba(0,176,119,0.15)', color: '#818cf8', textTransform: 'uppercase' }}>
                      Primary
                    </span>
                  )}
                  {d.source === 'NAMECOM' && (
                    <span style={{ padding: '0.1rem 0.45rem', borderRadius: 999, fontSize: '0.6rem', fontWeight: 700, background: 'rgba(16,185,129,0.12)', color: '#10b981', textTransform: 'uppercase' }}>
                      name.com
                    </span>
                  )}
                  {d.autoConfigured && (
                    <span style={{ padding: '0.1rem 0.45rem', borderRadius: 999, fontSize: '0.6rem', fontWeight: 700, background: 'rgba(6,182,212,0.12)', color: '#06b6d4', textTransform: 'uppercase' }}>
                      Auto-DNS
                    </span>
                  )}
                </div>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                  Added {new Date(d.createdAt).toLocaleDateString('en-IN')}
                  {d.verifiedAt && ` · Verified ${new Date(d.verifiedAt).toLocaleDateString('en-IN')}`}
                  {d.expiresAt && ` · Expires ${new Date(d.expiresAt).toLocaleDateString('en-IN')}`}
                </p>
              </div>

              {/* Tenant */}
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: '#818cf8' }}>{d.tenant.name}</p>
                <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{d.tenant.subdomain}.nixvra.online</p>
              </div>

              {/* Type */}
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: d.type === 'PRIMARY' ? '#818cf8' : 'var(--text-muted)' }}>
                {d.type}
              </span>

              {/* Status pill */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                padding: '0.25rem 0.625rem', borderRadius: 999,
                fontSize: '0.75rem', fontWeight: 700,
                background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap',
              }}>
                <cfg.icon style={{ width: 11, height: 11 }} /> {cfg.label}
              </span>

              {/* Quick actions */}
              <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                {d.status === 'PENDING_APPROVAL' && (
                  <>
                    <button
                      onClick={() => handleApprove(d)}
                      disabled={actionLoading === d.id + '_approve'}
                      style={{ width: 30, height: 30, borderRadius: 7, border: 'none', cursor: 'pointer', background: 'rgba(16,185,129,0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem' }}
                      title="Approve"
                    >✓</button>
                    <button
                      onClick={() => { setRejectId(d.id); setExpandedId(d.id) }}
                      style={{ width: 30, height: 30, borderRadius: 7, border: 'none', cursor: 'pointer', background: 'rgba(244,63,94,0.12)', color: '#f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem' }}
                      title="Reject"
                    >✕</button>
                  </>
                )}
                {['APPROVED', 'FAILED'].includes(d.status) && (
                  <button
                    onClick={() => handleVerify(d)}
                    disabled={actionLoading === d.id + '_verify'}
                    style={{ width: 30, height: 30, borderRadius: 7, border: 'none', cursor: 'pointer', background: 'rgba(0,176,119,0.12)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem' }}
                    title="Verify DNS"
                  >🔍</button>
                )}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : d.id)}
                  style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border)', cursor: 'pointer', background: 'var(--bg-raised)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}
                  title="Details"
                >
                  {isExpanded ? '▲' : '▼'}
                </button>
              </div>
            </div>

            {/* Expanded Panel */}
            {isExpanded && (
              <div style={{ borderTop: '1px solid var(--border)', padding: '1.25rem 1.25rem 1rem', background: 'var(--bg-raised)' }}>

                {/* Reject input */}
                {rejectId === d.id && d.status === 'PENDING_APPROVAL' && (
                  <div style={{ marginBottom: '1rem' }}>
                    <input
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="Reason for rejection..."
                      style={{
                        width: '100%', padding: '0.625rem 0.875rem', borderRadius: 8, boxSizing: 'border-box',
                        background: 'var(--bg-overlay)', border: '1px solid rgba(244,63,94,0.4)',
                        color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none', marginBottom: '0.5rem',
                      }}
                    />
                  </div>
                )}

                {/* Rejection reason display */}
                {d.status === 'REJECTED' && d.rejectionReason && (
                  <div style={{
                    padding: '0.75rem', borderRadius: 8, marginBottom: '1rem',
                    background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)',
                    fontSize: '0.875rem', color: '#fca5a5',
                  }}>
                    <strong>Rejection reason:</strong> {d.rejectionReason}
                  </div>
                )}

                {/* Vercel DNS config panel — for non-auto-configured domains */}
                {!d.autoConfigured && ['APPROVED', 'FAILED', 'VERIFYING'].includes(d.status) && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <ActivityIcon style={{ width: 14, height: 14 }} /> DNS Configuration
                      </p>
                      <button
                        onClick={() => handleSyncVercel(d)}
                        disabled={actionLoading === d.id + '_sync'}
                        style={{
                          padding: '0.25rem 0.625rem', borderRadius: 6, border: '1px solid var(--border)',
                          background: 'var(--bg-overlay)', color: 'var(--text-muted)',
                          fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem',
                        }}
                      >
                        <RefreshIcon style={{ width: 11, height: 11 }} />
                        {actionLoading === d.id + '_sync' ? 'Fetching...' : 'Refresh from Vercel'}
                      </button>
                    </div>
                    <DnsPanel
                      records={vercelRecords[d.id] ?? [
                        { type: d.domain.split('.').length === 2 ? 'A' : 'CNAME', name: d.domain.split('.').length === 2 ? '@' : d.domain.split('.')[0], value: d.domain.split('.').length === 2 ? '76.76.21.21' : 'cname.vercel-dns.com' }
                      ]}
                      verifyToken={d.verifyToken}
                    />
                  </div>
                )}

                {/* Auto-configured info */}
                {d.autoConfigured && (
                  <div style={{
                    padding: '0.75rem', borderRadius: 8, marginBottom: '1rem',
                    background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                    fontSize: '0.8125rem', color: '#10b981',
                  }}>
                    ✅ DNS auto-configured via Name.com API at time of purchase. No manual setup required.
                    {d.namecomOrderId && <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>Order: {d.namecomOrderId}</span>}
                  </div>
                )}

                {/* Verify result */}
                {verifyResults[d.id] && (
                  <div style={{
                    padding: '0.75rem', borderRadius: 8, marginBottom: '1rem',
                    background: verifyResults[d.id].verified ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)',
                    border: `1px solid ${verifyResults[d.id].verified ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}`,
                    fontSize: '0.8125rem',
                    color: verifyResults[d.id].verified ? '#10b981' : '#f43f5e',
                  }}>
                    {verifyResults[d.id].verified
                      ? '✅ DNS verified! Domain is now ACTIVE.'
                      : `❌ DNS not yet propagated — CNAME: ${verifyResults[d.id].dnsVerified ? '✓' : '✗'} · TXT: ${verifyResults[d.id].txtVerified ? '✓' : '✗'} · Vercel: ${verifyResults[d.id].vercelVerified ? '✓' : '✗'}`
                    }
                  </div>
                )}

                {/* Action buttons row */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {/* Approve/Reject for PENDING */}
                  {d.status === 'PENDING_APPROVAL' && (
                    <>
                      <button onClick={() => handleApprove(d)} disabled={!!actionLoading} style={btnStyle('approve')}>
                        <CheckIcon style={{ width: 13, height: 13 }} /> Approve + Add to Vercel
                      </button>
                      {rejectId === d.id ? (
                        <button onClick={() => handleReject(d)} disabled={!rejectReason} style={btnStyle('reject')}>
                          <CrossIcon style={{ width: 13, height: 13 }} /> Confirm Reject
                        </button>
                      ) : (
                        <button onClick={() => setRejectId(d.id)} style={btnStyle('reject')}>
                          <CrossIcon style={{ width: 13, height: 13 }} /> Reject
                        </button>
                      )}
                    </>
                  )}

                  {/* Verify DNS */}
                  {['APPROVED', 'FAILED'].includes(d.status) && (
                    <button onClick={() => handleVerify(d)} disabled={actionLoading === d.id + '_verify'} style={btnStyle('verify')}>
                      {actionLoading === d.id + '_verify'
                        ? <><RefreshIcon style={{ width: 13, height: 13 }} /> Checking...</>
                        : <><SearchIcon style={{ width: 13, height: 13 }} /> Check DNS</>
                      }
                    </button>
                  )}

                  {/* Re-verify active */}
                  {d.status === 'ACTIVE' && (
                    <button onClick={() => handleVerify(d)} disabled={actionLoading === d.id + '_verify'} style={btnStyle('verify')}>
                      <RefreshIcon style={{ width: 13, height: 13 }} /> Re-verify
                    </button>
                  )}

                  {/* Remove */}
                  <button onClick={() => handleRemove(d)} style={{ ...btnStyle('ghost'), marginLeft: 'auto' }}>
                    <TrashIcon style={{ width: 13, height: 13 }} /> Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
