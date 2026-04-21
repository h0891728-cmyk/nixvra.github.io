/**
 * NIXVRA - Module Permission System
 * Single source of truth for module→route mapping and access control.
 * If Super Admin removes a module from a tenant, all routes under that
 * module will block access with a 403-style redirect to /dashboard.
 */

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { masterDb } from '@/lib/db'

export function getEffectiveModules(entitledModules: string[], services: unknown): string[] {
  if (!services || typeof services !== 'object') return entitledModules
  const svc = services as Record<string, unknown>
  return entitledModules.filter(m => svc[m] !== false)
}

export function isServiceEnabled(services: unknown, serviceKey: string) {
  if (!services || typeof services !== 'object') return true
  return (services as Record<string, unknown>)[serviceKey] !== false
}

// ─── Module → Route mapping ───────────────────────────────────────────────────
// Each module key must match exactly what is stored in the Tenant.modules JSON array.
export const MODULE_ROUTES: Record<string, {
  path: string
  label: string
  icon: string       // material-symbols-outlined icon name
  section: 'workspace' | 'system'
}> = {
  CRM:        { path: '/dashboard/modules',      label: 'Polymorphic Modules', icon: 'view_module',   section: 'workspace' },
  ADS:        { path: '/dashboard/marketing',    label: 'Marketing & Ads',   icon: 'campaign',         section: 'workspace' },
  SOCIAL:     { path: '/dashboard/marketing',    label: 'Social Hub',        icon: 'forum',            section: 'workspace' },
  BILLING:    { path: '/dashboard/payroll',      label: 'Payroll & Billing', icon: 'account_balance',  section: 'workspace' },
  WEBHOOKS:   { path: '/dashboard/integrations', label: 'App Marketplace',   icon: 'hub',             section: 'workspace' },
  SCHEDULING: { path: '/dashboard/integrations', label: 'App Marketplace',   icon: 'hub',             section: 'workspace' },
  ANALYTICS:  { path: '/dashboard/integrations', label: 'App Marketplace',   icon: 'hub',             section: 'workspace' },
  AUDIT:      { path: '/dashboard/logs',         label: 'Activity Logs',     icon: 'policy',          section: 'system'    },
}

// Sidebar nav items — deduped by path, shown only if at least one mapped module is active
export const NAV_ITEMS: {
  path: string
  label: string
  icon: string
  section: 'workspace' | 'system'
  requiredModules: string[]  // any one of these being active shows the link
  requiredServices?: string[]
  alwaysVisible?: boolean    // show even with no module (home, domains, settings)
}[] = [
  {
    path: '/dashboard',
    label: 'Dashboard Home',
    icon: 'home',
    section: 'workspace',
    requiredModules: [],
    alwaysVisible: true,
  },
  {
    path: '/dashboard/modules',
    label: 'Polymorphic Modules',
    icon: 'view_module',
    section: 'workspace',
    requiredModules: ['CRM'],
  },
  {
    path: '/dashboard/marketing',
    label: 'Marketing & Comms',
    icon: 'campaign',
    section: 'workspace',
    requiredModules: ['ADS', 'SOCIAL'],
  },
  {
    path: '/dashboard/chat',
    label: 'Chat Module',
    icon: 'chat',
    section: 'workspace',
    requiredModules: ['SOCIAL'],
    requiredServices: ['CHAT'],
  },
  {
    path: '/dashboard/integrations',
    label: 'App Marketplace',
    icon: 'hub',
    section: 'workspace',
    requiredModules: ['WEBHOOKS', 'SCHEDULING', 'ANALYTICS'],
    alwaysVisible: true,  // Marketplace is available to all tenants
  },
  {
    path: '/dashboard/payroll',
    label: 'Financial ERP',
    icon: 'account_balance',
    section: 'workspace',
    requiredModules: ['BILLING'],
  },
  {
    path: '/dashboard/logs',
    label: 'Activity Logs',
    icon: 'gavel',
    section: 'system',
    requiredModules: ['AUDIT'],
  },
  {
    path: '/dashboard/domains',
    label: 'Domain Procurement',
    icon: 'public',
    section: 'system',
    requiredModules: [],
    alwaysVisible: true,
  },
]

// ─── Access Guard ─────────────────────────────────────────────────────────────
/**
 * Call this at the top of any module-gated page.
 * Fetches the tenant's active modules and redirects to /dashboard if the
 * required module is not enabled.
 *
 * Usage:
 *   await requireModule('BILLING')   // in payroll/page.tsx
 *   await requireModule('CRM')       // in entities/page.tsx
 *   await requireModule('ADS', 'SOCIAL') // either one allows access
 */
export async function requireModule(...requiredAny: string[]): Promise<{
  tenantId: string
  modules: string[]
  databaseName: string
}> {
  const session = await getSession()
  if (!session?.tenantId) redirect('/login')

  const tenant = await masterDb.tenant.findUnique({
    where: { id: session.tenantId },
    select: { id: true, modules: true, services: true, databaseName: true },
  })

  if (!tenant) redirect('/login')

  const entitledModules = (tenant.modules as string[]) ?? []
  const activeModules = getEffectiveModules(entitledModules, tenant.services)

  // If no modules are required (always-visible page) skip the check
  if (requiredAny.length > 0) {
    const hasAccess = requiredAny.some(m => activeModules.includes(m))
    if (!hasAccess) {
      redirect('/dashboard?blocked=true')
    }
  }

  return {
    tenantId: tenant.id,
    modules: activeModules,
    databaseName: tenant.databaseName,
  }
}

// ─── Sidebar filter helper ────────────────────────────────────────────────────
/**
 * Given the tenant's active module list, returns the nav items that should
 * be visible in the sidebar.
 */
export function getVisibleNavItems(activeModules: string[]) {
  // Dedupe by path — if a path appears in multiple required-module entries,
  // show it if ANY of those modules are active.
  const seen = new Set<string>()
  const visible: typeof NAV_ITEMS = []

  for (const item of NAV_ITEMS) {
    if (seen.has(item.path)) continue
    seen.add(item.path)

    if (item.alwaysVisible) {
      visible.push(item)
      continue
    }

    const hasAccess = item.requiredModules.some(m => activeModules.includes(m))
    if (hasAccess) visible.push(item)
  }

  return visible
}

export function getVisibleNavItemsWithServices(activeModules: string[], services: unknown) {
  const seen = new Set<string>()
  const visible: typeof NAV_ITEMS = []

  for (const item of NAV_ITEMS) {
    if (seen.has(item.path)) continue
    seen.add(item.path)

    if (item.alwaysVisible) {
      visible.push(item)
      continue
    }

    const hasModuleAccess =
      item.requiredModules.length === 0 ||
      item.requiredModules.some(m => activeModules.includes(m))
    const hasServiceAccess =
      !item.requiredServices || item.requiredServices.every(key => isServiceEnabled(services, key))

    if (hasModuleAccess && hasServiceAccess) visible.push(item)
  }

  return visible
}

export async function requireServiceEnabled(serviceKey: string) {
  const session = await getSession()
  if (!session?.tenantId) redirect('/login')

  const tenant = await masterDb.tenant.findUnique({
    where: { id: session.tenantId },
    select: { services: true },
  })

  if (!tenant) redirect('/login')
  if (!isServiceEnabled(tenant.services, serviceKey)) redirect('/dashboard?blocked=true')
}
