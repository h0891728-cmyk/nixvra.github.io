'use client'

import React, { useState, useEffect, useTransition, useCallback } from 'react'
import { getGlobalAdCampaigns } from '@/actions/super-admin-social'
import { toggleAdCampaign, deleteAdCampaign } from '@/actions/marketing'
import { provisionTenantAdAccount, crossTenantCreateAdCampaign } from '@/actions/super-admin-ads'
import { formatCompactNumber, formatCompactCurrency } from '@/lib/format'
import PaginationControls from '@/components/ui/PaginationControls'

type Tab = 'dashboard' | 'launcher' | 'provision'

const OBJECTIVE_LABELS: Record<string, string> = {
  LEADS: 'Lead Generation', TRAFFIC: 'Website Traffic',
  CONVERSIONS: 'Conversions', ENGAGEMENT: 'Engagement', APP_INSTALLS: 'App Installs',
}

const STATUS_PILL: Record<string, { bg: string; color: string; label: string }> = {
  ACTIVE:    { bg: 'rgba(16,185,129,0.12)',  color: '#10b981', label: 'Active' },
  PAUSED:    { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b', label: 'Paused' },
  COMPLETED: { bg: 'rgba(6,182,212,0.12)',   color: '#06b6d4', label: 'Completed' },
  ARCHIVED:  { bg: 'rgba(90,90,120,0.15)',   color: '#9898b8', label: 'Archived' }
}

function StatusPill({ status }: { status: string }) {
  const pill = STATUS_PILL[status] || { bg: 'rgba(90,90,120,0.15)', color: '#9898b8', label: status }
  return (
    <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: 999, background: pill.bg, color: pill.color, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
      {pill.label}
    </span>
  )
}

function TenantBadge({ tenant }: { tenant: { name: string; subdomain: string } }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-overlay)', padding: '0.2rem 0.5rem', borderRadius: 8, border: '1px solid var(--border)' }}>
      <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', color: '#00B077' }}>corporate_fare</span>
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{tenant.name}</span>
      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>({tenant.subdomain})</span>
    </div>
  )
}

export default function GlobalAdsManager({ tenants }: { tenants: { id: string; name: string; databaseName: string; subdomain: string }[] }) {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  const tabs = [
    { key: 'dashboard' as Tab, label: 'Control Center', icon: 'monitoring' },
    { key: 'launcher' as Tab, label: 'Cross-Tenant Ad Launcher', icon: 'campaign' },
    { key: 'provision' as Tab, label: 'Provision Ad Accounts', icon: 'account_tree' },
  ]

  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: toast.ok ? 'rgba(16,185,129,0.95)' : 'rgba(244,63,94,0.95)', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: 12, fontWeight: 600, fontSize: '0.875rem', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>{toast.ok ? 'check_circle' : 'error'}</span>{toast.msg}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.75rem', color: '#10b981' }}>ads_click</span>
            Ads Management System
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
            Govern Meta Ad Accounts and deploy highly-targeted campaigns for any tenant on the network.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-raised)', padding: '0.3rem', borderRadius: 12, border: '1px solid var(--border)', marginBottom: '1.25rem', width: 'fit-content' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.625rem 1.25rem', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem', transition: 'all 200ms', background: activeTab === t.key ? 'var(--bg-surface)' : 'transparent', color: activeTab === t.key ? 'var(--text-primary)' : 'var(--text-muted)', boxShadow: activeTab === t.key ? 'var(--shadow-sm)' : 'none' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && <GlobalAdsDashboard showToast={showToast} />}
      {activeTab === 'launcher'  && <GlobalAdsLauncher tenants={tenants} showToast={showToast} />}
      {activeTab === 'provision' && <GlobalAdsProvisioner tenants={tenants} showToast={showToast} />}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   1) DASHBOARD (CROSS-TENANT COMBINED LIST)
   ═══════════════════════════════════════════════════════════════ */
function GlobalAdsDashboard({ showToast }: { showToast: Function }) {
  const [campaigns, setCampaigns]     = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const [isPending, startTransition]  = useTransition()
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 9

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getGlobalAdCampaigns()
    setCampaigns(data)
    setCurrentPage(1)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  const totalPages = Math.max(1, Math.ceil(campaigns.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedCampaigns = campaigns.slice((safePage - 1) * pageSize, safePage * pageSize)

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>System-Wide Campaigns</h3>
        <button onClick={() => load()} disabled={loading} style={{ padding: '0.45rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>refresh</span>
        </button>
      </div>

      {loading ? <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading network campaigns...</div> : campaigns.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No ad campaigns found.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.875rem' }}>
          {paginatedCampaigns.map((c: any) => {
            const metrics: any = c.metrics || {}
            return (
              <div key={`${c.tenant.id}-${c.publicId}`} style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <TenantBadge tenant={c.tenant} />
                  <StatusPill status={c.status} />
                </div>
                <p style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.2rem' }}>
                  {OBJECTIVE_LABELS[c.objective] || c.objective}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <p style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10b981', margin: 0 }}>{formatCompactCurrency(c.budget)}</p>
                  {c.metaCampaignId && <span style={{ fontSize: '0.6875rem', color: '#10b981', fontWeight: 700 }}><span className="material-symbols-outlined" style={{ fontSize: '0.8rem', verticalAlign: 'middle', marginRight: 2 }}>verified</span>Live</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.375rem', marginBottom: '0.875rem' }}>
                  {[{ l: 'Impr', v: formatCompactNumber(metrics.impressions || 0) }, { l: 'Clicks', v: formatCompactNumber(metrics.clicks || 0) }, { l: 'Leads', v: formatCompactNumber(metrics.leads || 0) }, { l: 'Spent', v: formatCompactCurrency(metrics.spent || 0) }].map(m => (
                    <div key={m.l} style={{ textAlign: 'center', background: 'var(--bg-overlay)', borderRadius: 6, padding: '0.375rem 0.125rem' }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{m.v}</p>
                      <p style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>{m.l}</p>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => startTransition(async () => { await toggleAdCampaign(c.tenant.id, c.publicId); await load() })} disabled={isPending} style={{ flex: 1, padding: '0.5rem', borderRadius: 8, border: `1px solid ${c.status === 'ACTIVE' ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`, background: c.status === 'ACTIVE' ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)', color: c.status === 'ACTIVE' ? '#f59e0b' : '#10b981', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>{c.status === 'ACTIVE' ? 'pause' : 'play_arrow'}</span>
                    Force {c.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                  </button>
                  <button onClick={() => startTransition(async () => { await deleteAdCampaign(c.tenant.id, c.publicId); await load() })} disabled={isPending} style={{ padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid rgba(244,63,94,0.2)', background: 'rgba(244,63,94,0.08)', color: '#f43f5e', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>delete</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <PaginationControls
        currentPage={safePage}
        totalItems={campaigns.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        itemLabel="campaigns"
      />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   2) LAUNCHER (CREATE ADS IN TARGET TENANT)
   ═══════════════════════════════════════════════════════════════ */
function GlobalAdsLauncher({ tenants, showToast }: { tenants: any[], showToast: Function }) {
  const [isPending, startTransition] = useTransition()
  
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const db = fd.get('targetDb') as string
      const objective = fd.get('objective') as string
      const budget = Number(fd.get('budget'))
      
      const res = await crossTenantCreateAdCampaign(db, {
        objective, budget, targetAudience: { notes: 'Launched by Super Admin' }
      })

      if (res.success) {
        showToast('Campaign successfully injected into tenant environment.', true)
        e.currentTarget.reset()
      } else {
        showToast(res.error || 'Failed to inject campaign.', false)
      }
    })
  }

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem', maxWidth: 800 }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="material-symbols-outlined" style={{ fontSize: '1.6rem', color: '#00B077' }}>send_to_mobile</span>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Cross-Tenant Campaign Launcher</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>Force push an ad campaign into a specific tenant workspace. They must have an Ad Account provisioned.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Target Tenant Environment</label>
          <select name="targetDb" className="form-input" required>
            <option value="">Select a sub-system...</option>
            {tenants.map(t => <option key={t.id} value={t.databaseName}>{t.name} ({t.subdomain})</option>)}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
           <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Objective</label>
            <select name="objective" className="form-input" required>
              <option value="LEADS">Lead Generation</option>
              <option value="TRAFFIC">Website Traffic</option>
              <option value="CONVERSIONS">Conversions</option>
              <option value="ENGAGEMENT">Customer Engagement</option>
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Daily Budget (INR)</label>
            <input type="number" name="budget" placeholder="e.g. 500" defaultValue="500" className="form-input" required min="100" />
          </div>
        </div>

        <button type="submit" disabled={isPending} className="btn btn-primary" style={{ background: '#00B077', alignSelf: 'flex-start' }}>
           <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>{isPending ? 'sync' : 'rocket_launch'}</span>
           {isPending ? 'Deploying...' : 'Deploy Ad Campaign'}
        </button>
      </form>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   3) PROVISIONER (AD ACCOUNTS)
   ═══════════════════════════════════════════════════════════════ */
function GlobalAdsProvisioner({ tenants, showToast }: { tenants: any[], showToast: Function }) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const db = fd.get('tenantDb') as string
      const payload = {
        adAccountId: fd.get('adAccountId') as string,
        businessManagerId: fd.get('businessManagerId') as string,
        pixelId: fd.get('pixelId') as string,
      }

      await provisionTenantAdAccount(db, payload)
      showToast('Meta Ad Account successfully mapped to Tenant!', true)
      e.currentTarget.reset()
    })
  }

  return (
     <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem', maxWidth: 800 }}>
       <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="material-symbols-outlined" style={{ fontSize: '1.6rem', color: '#10b981' }}>admin_panel_settings</span>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Ad Account Provider Registry</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>Assign a Meta Ad Account ID permanently to a tenant to establish native tracking and creation powers.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Binding Tenant</label>
          <select name="tenantDb" className="form-input" required>
            <option value="">Select a sub-system...</option>
            {tenants.map(t => <option key={t.id} value={t.databaseName}>{t.name} ({t.subdomain})</option>)}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
           <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Meta Ad Account ID</label>
            <input type="text" name="adAccountId" placeholder="act_1234567890" className="form-input" style={{ fontFamily: 'monospace' }} required />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Business Manager ID <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span></label>
            <input type="text" name="businessManagerId" placeholder="1234567890" className="form-input" style={{ fontFamily: 'monospace' }} />
          </div>
           <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Tracking Pixel ID <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span></label>
            <input type="text" name="pixelId" placeholder="1234567890" className="form-input" style={{ fontFamily: 'monospace' }} />
          </div>
        </div>

        <button type="submit" disabled={isPending} className="btn btn-primary" style={{ background: '#10b981', alignSelf: 'flex-start' }}>
           <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>{isPending ? 'sync' : 'link'}</span>
           {isPending ? 'Binding...' : 'Bind Ad Account'}
        </button>
      </form>
     </div>
  )
}
