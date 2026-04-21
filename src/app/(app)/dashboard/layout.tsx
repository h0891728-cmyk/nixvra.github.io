import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { getTenantDb, masterDb } from '@/lib/db'
import { getEffectiveModules, getVisibleNavItemsWithServices } from '@/lib/modules'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const tenant = await masterDb.tenant.findUnique({
    where: { id: session.tenantId },
    select: { id: true, name: true, subdomain: true, industry: true, modules: true, services: true, databaseName: true },
  })

  if (!tenant) return <div>Tenant Not Found</div>

  const entitledModules = (tenant.modules as string[]) ?? []
  const services = tenant.services as unknown
  const activeModules = getEffectiveModules(entitledModules, services)
  let navItems = getVisibleNavItemsWithServices(activeModules, services)
  let linkedProfileType: string | null = null

  try {
    const db = await getTenantDb(tenant.databaseName)
    const linkedProfile = await db.businessEntity.findFirst({
      where: { userId: session.userId, deletedAt: null },
      select: { type: true },
    })
    linkedProfileType = linkedProfile?.type || null
  } catch (_) { }

  // STAFF only sees modules relevant to their linked profile role.
  if (session.role === 'STAFF') {
    const STAFF_PATH_MAP: Record<string, string[]> = {
      STAFF: ['/dashboard', '/dashboard/modules', '/dashboard/marketing', '/dashboard/chat'],
      TEACHER: ['/dashboard', '/dashboard/modules'],
      AGENT: ['/dashboard', '/dashboard/modules', '/dashboard/payroll', '/dashboard/marketing', '/dashboard/chat'],
      VENDOR: ['/dashboard', '/dashboard/modules', '/dashboard/payroll', '/dashboard/expenses'],
    }
    const allowedPaths = STAFF_PATH_MAP[linkedProfileType || ''] || ['/dashboard', '/dashboard/modules']
    navItems = navItems.filter(n => allowedPaths.includes(n.path))
  }

  const workspaceItems = navItems.filter(n => n.section === 'workspace')
  const systemItems = navItems.filter(n => n.section === 'system')

  // Industry-specific label for the CRM record hub
  function getRecordsLabel() {
    if (tenant!.industry === 'EDUCATION') return 'Students & Faculty'
    if (tenant!.industry === 'REAL_ESTATE') return 'Properties & Buyers'
    if (tenant!.industry === 'HEALTHCARE') return 'Patients & Doctors'
    return 'CRM Records'
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* SIDEBAR */}
      <aside style={{
        width: 260, flexShrink: 0,
        background: 'var(--bg-surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Brand Header */}
        <div style={{ padding: '1.25rem 1rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <img src="/logo.svg" alt="Nixvra" style={{ width: 42, height: 42, flexShrink: 0 }} />
          </div>
          <p style={{
            fontSize: '0.6875rem',
            color: 'var(--text-muted)',
            margin: 0,
            textAlign: 'center',
            lineHeight: 1.5,
          }}>
            {tenant.name} · {tenant.subdomain}.nixvra.online
          </p>

          {/* Active module count badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            marginTop: '0.75rem', padding: '0.375rem 0.625rem',
            background: 'var(--bg-raised)', borderRadius: 8, border: '1px solid var(--border)',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '0.875rem', color: '#00B077' }}>
              verified
            </span>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {activeModules.length} active module{activeModules.length !== 1 ? 's' : ''}
            </span>
            <div style={{ display: 'flex', gap: '0.2rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
              {activeModules.slice(0, 4).map(m => (
                <span key={m} style={{
                  fontSize: '0.5625rem', fontWeight: 700, padding: '0.1rem 0.3rem',
                  background: 'rgba(0,176,119,0.12)', color: '#00B077', borderRadius: 4,
                }}>{m}</span>
              ))}
              {activeModules.length > 4 && (
                <span style={{
                  fontSize: '0.5625rem', fontWeight: 700, padding: '0.1rem 0.3rem',
                  background: 'var(--bg-raised)', color: 'var(--text-muted)', borderRadius: 4,
                }}>+{activeModules.length - 4}</span>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ padding: '0 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.125rem', flex: 1, overflowY: 'auto' }}>

          {/* Workspace section */}
          <p style={{
            fontSize: '0.625rem', fontWeight: 800, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            padding: '0.875rem 0.5rem 0.375rem', margin: 0,
          }}>
            Workspace
          </p>

          {workspaceItems.map(item => (
            <Link
              key={item.path + item.label}
              href={item.path}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                padding: '0.5rem 0.625rem', borderRadius: 8,
                color: 'var(--text-primary)', textDecoration: 'none',
                fontSize: '0.875rem', fontWeight: 600,
                transition: 'background 150ms',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                {item.icon}
              </span>
              {/* Use dynamic industry-specific label for CRM route */}
              {item.path === '/dashboard/modules' ? getRecordsLabel() : item.label}
            </Link>
          ))}

          {/* System section */}
          {systemItems.length > 0 && (
            <>
              <p style={{
                fontSize: '0.625rem', fontWeight: 800, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                padding: '0.875rem 0.5rem 0.375rem', margin: 0,
              }}>
                System
              </p>
              {systemItems.map(item => (
                <Link
                  key={item.path + item.label}
                  href={item.path}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.625rem',
                    padding: '0.5rem 0.625rem', borderRadius: 8,
                    color: 'var(--text-primary)', textDecoration: 'none',
                    fontSize: '0.875rem', fontWeight: 600,
                    transition: 'background 150ms',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              ))}
            </>
          )}

          {/* Always-shown settings link */}
          <p style={{
            fontSize: '0.625rem', fontWeight: 800, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            padding: '0.875rem 0.5rem 0.375rem', margin: 0,
          }}>
            Account
          </p>
          <Link href="/dashboard/settings" style={{
            display: 'flex', alignItems: 'center', gap: '0.625rem',
            padding: '0.5rem 0.625rem', borderRadius: 8,
            color: 'var(--text-primary)', textDecoration: 'none',
            fontSize: '0.875rem', fontWeight: 600,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: 'var(--text-muted)', flexShrink: 0 }}>
              settings
            </span>
            Workspace Settings
          </Link>
        </nav>
      </aside>

      <main style={{ flex: 1, minWidth: 0 }}>
        {children}
      </main>
    </div>
  )
}
