'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { logoutAction } from '@/actions/auth'
import type { SessionPayload } from '@/lib/session'

const NAV_SECTIONS = [
  {
    label: 'Command Center',
    items: [
      { href: '/super-admin', label: 'Overview', icon: GridIcon, exact: true },
      { href: '/super-admin/tenants', label: 'Tenants', icon: BuildingIcon },
      { href: '/super-admin/users', label: 'All Users', icon: UsersIcon },
      { href: '/super-admin/tasks', label: 'Tasks', icon: ShieldIcon },
    ],
  },
  {
    label: 'Platform',
    items: [
      { href: '/super-admin/integrations', label: 'Integration Hub', icon: PlugIcon },
      { href: '/super-admin/domains', label: 'Domains', icon: GlobeIcon },
      { href: '/super-admin/social', label: 'Marketing & Social', icon: ShareIcon },
      { href: '/super-admin/ads', label: 'Ad Campaigns', icon: MegaphoneIcon },
      { href: '/super-admin/webhooks', label: 'Webhook Events', icon: ZapIcon },
    ],
  },
  {
    label: 'Finance & CRM',
    items: [
      { href: '/super-admin/entities', label: 'Business Entities', icon: PersonIcon },
      { href: '/super-admin/payroll/master', label: 'Master Payroll', icon: BankIcon },
      { href: '/super-admin/transactions', label: 'Transactions', icon: CreditCardIcon },
      { href: '/super-admin/audit', label: 'Audit Log', icon: ShieldIcon },
    ],
  },
]

export default function SuperAdminSidebar({ session }: { session: SessionPayload }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile sidebar on route change (deferred to avoid setState-in-effect lint rule)
  useEffect(() => {
    const t = setTimeout(() => setMobileOpen(false), 0)
    return () => clearTimeout(t)
  }, [pathname])

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div style={{
        padding: '1.25rem 1rem',
        display: 'flex', alignItems: 'center', gap: '0.625rem',
        borderBottom: '1px solid var(--border)',
      }}>
        <img src="/logo.svg" alt="Nixvra" style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0 }} />
        {!collapsed && (
          <div style={{
            padding: '0.2rem 0.55rem',
            borderRadius: 999,
            background: 'rgba(0,176,119,0.08)',
            border: '1px solid rgba(0,176,119,0.16)',
            color: '#00B077',
            fontSize: '0.6875rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            Super Admin
          </div>
        )}
        {/* Collapse toggle — desktop only */}
        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', width: 28, height: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 6, flexShrink: 0,
          }}
          aria-label="Toggle sidebar"
          className="d-none d-lg-flex"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {collapsed
              ? <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>
              : <><line x1="3" y1="6" x2="15" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="15" y2="18"/></>
            }
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '0.5rem 0.625rem', overflowY: 'auto' }}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} style={{ marginBottom: '0.25rem' }}>
            {!collapsed && (
              <p style={{
                fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: 'var(--text-muted)',
                padding: '0.875rem 0.5rem 0.375rem', margin: 0,
              }}>{section.label}</p>
            )}
            {section.items.map((item) => {
              const active = isActive(item.href, item.exact)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  aria-current={active ? 'page' : undefined}
                  title={collapsed ? item.label : undefined}
                  style={{
                    display: 'flex', alignItems: 'center',
                    gap: collapsed ? 0 : '0.625rem',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    padding: '0.6rem 0.625rem',
                    borderRadius: 8, marginBottom: 2,
                    textDecoration: 'none',
                    fontSize: '0.875rem', fontWeight: 500,
                    color: active ? '#00B077' : 'var(--text-secondary)',
                    background: active ? 'rgba(0,176,119,0.1)' : 'transparent',
                    border: `1px solid ${active ? 'rgba(0,176,119,0.2)' : 'transparent'}`,
                    transition: 'all 150ms',
                  }}
                >
                  <item.icon style={{ width: 18, height: 18, flexShrink: 0, opacity: active ? 1 : 0.7 }} aria-hidden />
                  {!collapsed && item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)' }}>
        {!collapsed && (
          <div style={{ padding: '0.5rem 0.625rem', marginBottom: '0.375rem' }}>
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {session.email}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#00B077', marginTop: 2, margin: 0 }}>Super Administrator</p>
          </div>
        )}
        <form action={logoutAction}>
          <button
            type="submit" id="btn-logout"
            title={collapsed ? 'Sign out' : undefined}
            style={{
              display: 'flex', alignItems: 'center',
              gap: collapsed ? 0 : '0.625rem',
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: '0.6rem 0.625rem', width: '100%',
              borderRadius: 8, background: 'none', border: 'none',
              cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-muted)',
              transition: 'all 150ms',
            }}
          >
            <LogoutIcon style={{ width: 18, height: 18, flexShrink: 0 }} aria-hidden />
            {!collapsed && 'Sign out'}
          </button>
        </form>
      </div>
    </>
  )

  return (
    <>
      {/* ── DESKTOP SIDEBAR ── */}
      <aside
        className="d-none d-lg-flex flex-column"
        style={{
          width: collapsed ? 70 : 260,
          minWidth: collapsed ? 70 : 260,
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border)',
          height: '100dvh',
          position: 'sticky', top: 0,
          transition: 'width 250ms, min-width 250ms',
          overflow: 'hidden',
        }}
        aria-label="Super Admin Navigation"
      >
        {sidebarContent}
      </aside>

      {/* ── MOBILE OVERLAY ── */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 1040, backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* ── MOBILE DRAWER ── */}
      <aside
        className="d-lg-none flex-column"
        style={{
          display: 'flex',
          position: 'fixed', top: 0, left: mobileOpen ? 0 : -280,
          width: 260, height: '100dvh', zIndex: 1050,
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border)',
          transition: 'left 280ms cubic-bezier(0.4,0,0.2,1)',
          overflow: 'hidden',
        }}
        aria-label="Mobile Navigation"
      >
        {sidebarContent}
      </aside>

      {/* ── MOBILE TOPBAR TOGGLE ── */}
      <button
        className="d-lg-none"
        onClick={() => setMobileOpen(o => !o)}
        aria-label="Open navigation"
        style={{
          position: 'fixed', top: 12, left: 12, zIndex: 1055,
          width: 40, height: 40, borderRadius: 8,
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-primary)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
    </>
  )
}

/* ─── SVG Icons ────────────────────────────────────────────────────── */
type SvgProps = { style?: React.CSSProperties; className?: string; 'aria-hidden'?: boolean }
const iconBase = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.75', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

function GridIcon(p: SvgProps) { return <svg {...iconBase} {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> }
function BuildingIcon(p: SvgProps) { return <svg {...iconBase} {...p}><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"/></svg> }
function UsersIcon(p: SvgProps) { return <svg {...iconBase} {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> }
function PlugIcon(p: SvgProps) { return <svg {...iconBase} {...p}><path d="M18 6 6 18M7 6v4l-4 4 3 3 4-4h4l6-6-3-3z"/></svg> }
function GlobeIcon(p: SvgProps) { return <svg {...iconBase} {...p}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> }
function ShareIcon(p: SvgProps) { return <svg {...iconBase} {...p}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> }
function MegaphoneIcon(p: SvgProps) { return <svg {...iconBase} {...p}><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg> }
function ZapIcon(p: SvgProps) { return <svg {...iconBase} {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> }
function PersonIcon(p: SvgProps) { return <svg {...iconBase} {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
function CreditCardIcon(p: SvgProps) { return <svg {...iconBase} {...p}><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> }
function ShieldIcon(p: SvgProps) { return <svg {...iconBase} {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> }
function LogoutIcon(p: SvgProps) { return <svg {...iconBase} {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> }
function BankIcon(p: SvgProps) { return <svg {...iconBase} {...p}><polygon points="12 2 2 7 22 7 12 2"/><line x1="4" y1="22" x2="20" y2="22"/><rect x="4" y="9" width="3" height="11"/><rect x="10" y="9" width="3" height="11"/><rect x="16" y="9" width="3" height="11"/></svg> }
