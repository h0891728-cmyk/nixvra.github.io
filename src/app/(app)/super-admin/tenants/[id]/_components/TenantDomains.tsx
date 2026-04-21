'use client'

import { useState, useTransition } from 'react'
import {
  requestDomainAction, addVercelDomainAction, approveDomainAction, rejectDomainAction,
  verifyDomainDnsAction, removeDomainAction, setPrimaryDomainAction, syncVercelStatusAction,
} from '@/actions/domain'

import {
  GlobeIcon, CheckIcon, ClockIcon, BlockIcon, RefreshIcon, LockIcon, UnlockIcon,
  SearchIcon, TrashIcon, StarIcon, CrossIcon, ActivityIcon,
} from '@/components/icons'

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: any }> = {
  PENDING_APPROVAL: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Pending Approval', icon: ClockIcon },
  APPROVED:         { color: '#06b6d4', bg: 'rgba(6,182,212,0.1)',  label: 'Approved — Awaiting DNS', icon: CheckIcon },
  VERIFYING:        { color: '#008E60', bg: 'rgba(0,142,96,0.1)', label: 'Verifying DNS', icon: RefreshIcon },
  ACTIVE:           { color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: 'Active', icon: GlobeIcon },
  FAILED:           { color: '#f43f5e', bg: 'rgba(244,63,94,0.1)',  label: 'DNS Failed', icon: CrossIcon },
  REJECTED:         { color: '#5a5a78', bg: 'rgba(90,90,120,0.1)',  label: 'Rejected', icon: BlockIcon },
}

type Domain = {
  id: string; domain: string; type: string; status: string;
  source?: string; autoConfigured?: boolean; registrar?: string | null;
  namecomOrderId?: string | null;
  verifyToken: string; dnsTarget: string; sslStatus: string;
  approvedAt: string | null; verifiedAt: string | null;
  rejectedAt: string | null; rejectionReason: string | null;
  createdAt: string;
}

type DnsRecord = { type: string; name: string; value: string }

interface TenantDomainsProps {
  tenantId: string
  initialDomains: Domain[]
  isSuperAdmin?: boolean
}

export default function TenantDomains({ tenantId, initialDomains, isSuperAdmin = false }: TenantDomainsProps) {
  const [domains, setDomains] = useState<Domain[]>(initialDomains)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addMode, setAddMode] = useState<'vercel' | 'request'>('vercel')
  const [domainInput, setDomainInput] = useState('')
  const [isPending, startTransition] = useTransition()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [verifyResult, setVerifyResult] = useState<Record<string, any>>({})
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [vercelRecords, setVercelRecords] = useState<Record<string, DnsRecord[]>>({})
  const [addResult, setAddResult] = useState<any>(null)

  // ── Add domain (Super Admin → Vercel direct, Tenant → request) ─────────────
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const d = domainInput.trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/\/.*$/, '')
    if (!d) return

    startTransition(async () => {
      if (isSuperAdmin) {
        // Super Admin: directly add to Vercel + approve
        const result = await addVercelDomainAction(tenantId, d)
        setAddResult(result)
        if (result.success) {
          if (result.vercelRequiredRecords?.length) {
            setVercelRecords(prev => ({ ...prev, ['new']: result.vercelRequiredRecords! }))
          }
          const newDomain: Domain = {
            id: 'tmp-' + Date.now(), domain: d, type: 'PRIMARY',
            status: 'APPROVED', source: 'EXTERNAL', autoConfigured: false,
            verifyToken: '', dnsTarget: 'cname.vercel-dns.com',
            sslStatus: 'PENDING', approvedAt: new Date().toISOString(),
            verifiedAt: null, rejectedAt: null, rejectionReason: null,
            createdAt: new Date().toISOString(),
          }
          setDomains(prev => [...prev, newDomain])
          setShowAddForm(false)
          setDomainInput('')
        }
      } else {
        // Tenant: submit request for approval
        const fd = new FormData()
        fd.set('domain', d)
        await requestDomainAction(tenantId, fd)
        setDomains(prev => [...prev, {
          id: 'tmp-' + Date.now(), domain: d, type: 'PRIMARY',
          status: 'PENDING_APPROVAL', source: 'EXTERNAL', autoConfigured: false,
          verifyToken: '', dnsTarget: 'cname.vercel-dns.com',
          sslStatus: 'PENDING', approvedAt: null, verifiedAt: null,
          rejectedAt: null, rejectionReason: null, createdAt: new Date().toISOString(),
        }])
        setShowAddForm(false)
        setDomainInput('')
      }
    })
  }

  async function handleApprove(id: string) {
    setActionLoading(id + '_approve')
    const result = await approveDomainAction(id)
    setDomains(d => d.map(x => x.id === id ? { ...x, status: 'APPROVED', approvedAt: new Date().toISOString() } : x))
    if (result?.requiredRecords?.length) {
      setVercelRecords(prev => ({ ...prev, [id]: result.requiredRecords }))
      setExpandedId(id)
    }
    setActionLoading(null)
  }

  async function handleReject(id: string) {
    setActionLoading(id + '_reject')
    await rejectDomainAction(id, rejectReason)
    setDomains(d => d.map(x => x.id === id ? { ...x, status: 'REJECTED', rejectedAt: new Date().toISOString(), rejectionReason: rejectReason } : x))
    setRejectId(null)
    setRejectReason('')
    setActionLoading(null)
  }

  async function handleVerify(id: string) {
    setActionLoading(id + '_verify')
    const result = await verifyDomainDnsAction(id)
    setVerifyResult(r => ({ ...r, [id]: result }))
    setDomains(d => d.map(x => x.id === id ? {
      ...x,
      status: result.verified ? 'ACTIVE' : 'FAILED',
      sslStatus: result.verified ? 'ACTIVE' : 'PENDING',
      verifiedAt: result.verified ? new Date().toISOString() : null,
    } : x))
    setActionLoading(null)
  }

  async function handleSyncVercel(id: string) {
    setActionLoading(id + '_sync')
    const result = await syncVercelStatusAction(id)
    if (result.success && result.requiredRecords?.length) {
      setVercelRecords(prev => ({ ...prev, [id]: result.requiredRecords! }))
    }
    setExpandedId(id)
    setActionLoading(null)
  }

  async function handleRemove(id: string, domain: string) {
    if (!confirm(`Remove "${domain}"? This will also remove it from Vercel.`)) return
    await removeDomainAction(id, tenantId)
    setDomains(d => d.filter(x => x.id !== id))
  }

  async function handleSetPrimary(id: string) {
    await setPrimaryDomainAction(id, tenantId)
    setDomains(d => d.map(x => ({ ...x, type: x.id === id ? 'PRIMARY' : 'ALIAS' })))
  }

  const card = (style?: React.CSSProperties) => ({
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 16, padding: '1.5rem', ...style,
  })

  const btn = (variant: 'approve' | 'reject' | 'verify' | 'ghost' | 'primary') => {
    const base = {
      padding: '0.4375rem 0.875rem', borderRadius: 8, border: 'none',
      fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: '0.375rem',
    }
    const v = {
      approve: { background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' },
      reject:  { background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.3)', color: '#f43f5e' },
      verify:  { background: 'rgba(0,176,119,0.15)', border: '1px solid rgba(0,176,119,0.3)', color: '#818cf8' },
      ghost:   { background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)' },
      primary: { background: 'linear-gradient(135deg,#00B077,#008E60)', color: '#fff' },
    }
    return { ...base, ...v[variant] }
  }

  return (
    <div style={card({ marginTop: '1.25rem' })}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <GlobeIcon style={{ width: 16, height: 16, color: '#00B077' }} />
            Custom Domains
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
            {isSuperAdmin
              ? 'Add domains directly via Vercel. DNS records shown after adding.'
              : 'Submit a domain request — Super Admin will approve and provide DNS instructions.'}
          </p>
        </div>
        <button onClick={() => { setShowAddForm(v => !v); setAddResult(null) }} style={{
          padding: '0.5rem 1.125rem', borderRadius: 10,
          background: showAddForm ? 'var(--bg-raised)' : 'linear-gradient(135deg, #00B077, #008E60)',
          border: showAddForm ? '1px solid var(--border)' : 'none',
          color: showAddForm ? 'var(--text-muted)' : '#fff',
          fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
        }}>
          {showAddForm ? '✕ Cancel' : isSuperAdmin ? '+ Add to Vercel' : '+ Request Domain'}
        </button>
      </div>

      {/* Add Domain Form */}
      {showAddForm && (
        <form onSubmit={handleAdd} style={{
          padding: '1.25rem', borderRadius: 12, marginBottom: '1.25rem',
          background: 'var(--bg-raised)', border: '1px solid var(--border)',
        }}>
          {/* Super Admin mode toggle */}
          {isSuperAdmin && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              {([
                { key: 'vercel', label: <><span className="material-symbols-outlined" style={{ fontSize: '1.1em', verticalAlign: 'middle' }}>bolt</span> Add to Vercel (Instant Approve)</> },
                { key: 'request', label: <><span className="material-symbols-outlined" style={{ fontSize: '1.1em', verticalAlign: 'middle' }}>description</span> Submit as Request</> },
              ] as const).map(m => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setAddMode(m.key)}
                  style={{
                    padding: '0.375rem 0.875rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontWeight: 600, fontSize: '0.8125rem',
                    background: addMode === m.key ? 'rgba(0,176,119,0.15)' : 'var(--bg-overlay)',
                    color: addMode === m.key ? '#818cf8' : 'var(--text-muted)',
                    borderBottom: addMode === m.key ? '2px solid #00B077' : '2px solid transparent',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}

          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Domain Name
          </label>
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <input
              value={domainInput}
              onChange={e => setDomainInput(e.target.value.toLowerCase().replace(/\s/g, ''))}
              placeholder="app.yourcompany.com"
              required
              style={{
                flex: 1, padding: '0.75rem 1rem', borderRadius: 10,
                background: 'var(--bg-overlay)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: '0.9375rem', outline: 'none',
              }}
            />
            <button type="submit" disabled={isPending} style={{...btn('primary'), display: 'flex', alignItems: 'center', gap: '4px'}}>
              {isPending ? <span className="material-symbols-outlined">hourglass_empty</span> : isSuperAdmin ? <><span className="material-symbols-outlined">arrow_forward</span> Add to Vercel</> : <><span className="material-symbols-outlined">arrow_forward</span> Submit Request</>}
            </button>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {isSuperAdmin
              ? 'Domain will be added to Vercel project and approved immediately. DNS records will be shown.'
              : 'Enter your custom domain (e.g. crm.company.com). Request will be reviewed by Super Admin.'}
          </p>

          {/* Add result — show required DNS records right away */}
          {addResult && !addResult.success && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', borderRadius: 8, background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', fontSize: '0.8125rem', color: '#f43f5e' }}>
              ❌ {addResult.error}
            </div>
          )}
        </form>
      )}

      {/* Domain List */}
      {domains.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
          <GlobeIcon style={{ width: 32, height: 32, marginBottom: '0.5rem', opacity: 0.5 }} />
          <p style={{ margin: 0 }}>No custom domains yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {domains.map(d => {
            const cfg = STATUS_CONFIG[d.status] ?? STATUS_CONFIG.PENDING_APPROVAL
            const isExpanded = expandedId === d.id

            return (
              <div key={d.id} style={{
                borderRadius: 14, overflow: 'hidden',
                border: `1px solid ${d.status === 'ACTIVE' ? 'rgba(16,185,129,0.25)' : d.status === 'FAILED' ? 'rgba(244,63,94,0.25)' : 'var(--border)'}`,
                background: 'var(--bg-raised)',
              }}>
                {/* Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem', flexWrap: 'wrap' }}>
                  {/* SSL */}
                  <div style={{ fontSize: '0.875rem' }}>
                    {d.sslStatus === 'ACTIVE'
                      ? <LockIcon style={{ width: 14, height: 14, color: '#10b981' }} />
                      : <UnlockIcon style={{ width: 14, height: 14, color: '#f59e0b' }} />}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                        {d.domain}
                      </span>
                      {d.type === 'PRIMARY' && (
                        <span style={{ padding: '0.1rem 0.5rem', borderRadius: 999, fontSize: '0.6rem', fontWeight: 700, background: 'rgba(0,176,119,0.15)', color: '#818cf8', textTransform: 'uppercase' }}>
                          Primary
                        </span>
                      )}
                      {d.source === 'NAMECOM' && (
                        <span style={{ padding: '0.1rem 0.5rem', borderRadius: 999, fontSize: '0.6rem', fontWeight: 700, background: 'rgba(16,185,129,0.12)', color: '#10b981', textTransform: 'uppercase' }}>
                          name.com
                        </span>
                      )}
                      {d.autoConfigured && (
                        <span style={{ padding: '0.1rem 0.5rem', borderRadius: 999, fontSize: '0.6rem', fontWeight: 700, background: 'rgba(6,182,212,0.12)', color: '#06b6d4', textTransform: 'uppercase' }}>
                          Auto-DNS
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Added {new Date(d.createdAt).toLocaleDateString('en-IN')}
                      {d.verifiedAt && ` · Verified ${new Date(d.verifiedAt).toLocaleDateString('en-IN')}`}
                    </p>
                  </div>

                  {/* Status pill */}
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.75rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap' }}>
                    <cfg.icon style={{ width: 12, height: 12 }} /> {cfg.label}
                  </span>

                  {/* Expand */}
                  <button onClick={() => setExpandedId(isExpanded ? null : d.id)} style={{
                    width: 28, height: 28, borderRadius: 8, background: 'var(--bg-overlay)',
                    border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {isExpanded ? '▲' : '▼'}
                  </button>
                </div>

                {/* Expanded Panel */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '1.25rem 1rem 1rem' }}>

                    {/* Auto-configured badge */}
                    {d.autoConfigured && (
                      <div style={{
                        padding: '0.75rem', borderRadius: 8, marginBottom: '1rem',
                        background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                        fontSize: '0.8125rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px'
                      }}>
                        <span className="material-symbols-outlined">check_circle</span> DNS auto-configured via Name.com API at purchase. No manual setup required.
                        {d.namecomOrderId && <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>Order: {d.namecomOrderId}</span>}
                      </div>
                    )}

                    {/* Vercel DNS Records Panel */}
                    {!d.autoConfigured && ['APPROVED', 'FAILED', 'VERIFYING'].includes(d.status) && (
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                          <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <ActivityIcon style={{ width: 14, height: 14 }} /> DNS Configuration
                          </p>
                          {isSuperAdmin && (
                            <button
                              onClick={() => handleSyncVercel(d.id)}
                              disabled={actionLoading === d.id + '_sync'}
                              style={{
                                padding: '0.25rem 0.625rem', borderRadius: 6,
                                border: '1px solid var(--border)', background: 'var(--bg-overlay)',
                                color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '0.25rem',
                              }}
                            >
                              <RefreshIcon style={{ width: 11, height: 11 }} />
                              {actionLoading === d.id + '_sync' ? 'Fetching...' : 'Refresh from Vercel'}
                            </button>
                          )}
                        </div>

                        {/* DNS Records Table */}
                        {(vercelRecords[d.id] ?? [
                          d.domain.split('.').length === 2
                            ? { type: 'A', name: '@', value: '76.76.21.21' }
                            : { type: 'CNAME', name: d.domain.split('.')[0], value: 'cname.vercel-dns.com' }
                        ]).map((r: DnsRecord, i: number) => (
                          <div key={i} style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: '0.5rem' }}>
                            <div style={{
                              display: 'grid', gridTemplateColumns: '70px 1fr 1fr',
                              padding: '0.375rem 0.875rem', gap: '1rem',
                              background: 'var(--bg-overlay)', borderBottom: '1px solid var(--border)',
                              fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em',
                              color: 'var(--text-muted)', textTransform: 'uppercase',
                            }}>
                              <span>Type</span><span>Name</span><span>Value (click to copy)</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr', padding: '0.625rem 0.875rem', gap: '1rem' }}>
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

                        {/* TXT fallback */}
                        {d.verifyToken && (
                          <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: '0.5rem' }}>
                            <div style={{
                              padding: '0.375rem 0.875rem', background: 'var(--bg-overlay)',
                              borderBottom: '1px solid var(--border)',
                              fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)',
                            }}>TXT — Alternative Verification</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr', padding: '0.625rem 0.875rem', gap: '1rem' }}>
                              <code style={{ fontSize: '0.8125rem', color: '#f59e0b', fontFamily: 'monospace' }}>TXT</code>
                              <code style={{ fontSize: '0.8125rem', color: '#818cf8', fontFamily: 'monospace' }}>@</code>
                              <code
                                style={{ fontSize: '0.8125rem', color: '#818cf8', fontFamily: 'monospace', cursor: 'pointer', overflowWrap: 'anywhere' }}
                                onClick={() => navigator.clipboard.writeText(d.verifyToken)}
                                title="Click to copy"
                              >{d.verifyToken}</code>
                            </div>
                          </div>
                        )}
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span className="material-symbols-outlined" style={{fontSize: '1.2em'}}>lightbulb</span> Click values to copy • DNS propagation up to 48h • Then click "Check DNS"
                        </p>
                      </div>
                    )}

                    {/* Rejection reason */}
                    {d.status === 'REJECTED' && d.rejectionReason && (
                      <div style={{
                        padding: '0.75rem', borderRadius: 8, marginBottom: '1rem',
                        background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)',
                        fontSize: '0.875rem', color: '#fca5a5',
                      }}>
                        <strong>Rejection reason:</strong> {d.rejectionReason}
                      </div>
                    )}

                    {/* Reject input */}
                    {rejectId === d.id && (
                      <input
                        value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                        placeholder="Reason for rejection..."
                        style={{
                          width: '100%', padding: '0.625rem 0.875rem', borderRadius: 8, boxSizing: 'border-box',
                          background: 'var(--bg-overlay)', border: '1px solid rgba(244,63,94,0.4)',
                          color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none', marginBottom: '0.75rem',
                        }}
                      />
                    )}

                    {/* Verify result */}
                    {verifyResult[d.id] && (
                      <div style={{
                        marginTop: '0.625rem', padding: '0.625rem 0.875rem', borderRadius: 8, marginBottom: '0.75rem',
                        background: verifyResult[d.id].verified ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)',
                        border: `1px solid ${verifyResult[d.id].verified ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}`,
                        fontSize: '0.8125rem',
                        color: verifyResult[d.id].verified ? '#10b981' : '#f43f5e',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                          <span className="material-symbols-outlined">{verifyResult[d.id].verified ? 'check_circle' : 'cancel'}</span>
                          <div>
                            {verifyResult[d.id].verified
                              ? 'DNS verified! Domain is now ACTIVE.'
                              : `Not verified — CNAME: ${verifyResult[d.id].dnsVerified ? '✓' : '✗'} · TXT: ${verifyResult[d.id].txtVerified ? '✓' : '✗'} · Vercel: ${verifyResult[d.id].vercelVerified ? '✓' : '✗'} — propagation can take up to 48h.`}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {/* Super Admin: Approve/Reject */}
                      {isSuperAdmin && d.status === 'PENDING_APPROVAL' && (
                        <>
                          <button onClick={() => handleApprove(d.id)} disabled={actionLoading === d.id + '_approve'} style={btn('approve')}>
                            <CheckIcon style={{ width: 13, height: 13 }} /> Approve + Add to Vercel
                          </button>
                          <button onClick={() => setRejectId(rejectId === d.id ? null : d.id)} style={btn('reject')}>
                            <CrossIcon style={{ width: 13, height: 13 }} /> Reject
                          </button>
                          {rejectId === d.id && (
                            <button onClick={() => handleReject(d.id)} disabled={!rejectReason} style={btn('reject')}>
                              Confirm
                            </button>
                          )}
                        </>
                      )}

                      {/* Verify DNS */}
                      {['APPROVED', 'FAILED'].includes(d.status) && (
                        <button onClick={() => handleVerify(d.id)} disabled={actionLoading === d.id + '_verify'} style={btn('verify')}>
                          {actionLoading === d.id + '_verify'
                            ? <><RefreshIcon style={{ width: 13, height: 13 }} /> Checking...</>
                            : <><SearchIcon style={{ width: 13, height: 13 }} /> Check DNS</>
                          }
                        </button>
                      )}

                      {/* Re-verify active */}
                      {d.status === 'ACTIVE' && (
                        <button onClick={() => handleVerify(d.id)} disabled={actionLoading === d.id + '_verify'} style={btn('verify')}>
                          <RefreshIcon style={{ width: 13, height: 13 }} /> Re-verify
                        </button>
                      )}

                      {/* Set Primary */}
                      {d.status === 'ACTIVE' && d.type !== 'PRIMARY' && (
                        <button onClick={() => handleSetPrimary(d.id)} style={btn('ghost')}>
                          <StarIcon style={{ width: 13, height: 13 }} /> Set Primary
                        </button>
                      )}

                      {/* Remove */}
                      <button onClick={() => handleRemove(d.id, d.domain)} style={{ ...btn('ghost'), marginLeft: 'auto' }}>
                        <TrashIcon style={{ width: 13, height: 13 }} /> Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
