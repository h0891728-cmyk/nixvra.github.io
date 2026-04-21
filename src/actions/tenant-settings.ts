'use server'

import { masterDb } from '@/lib/db'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import { SOCIAL_AUTOMATION_CARDS, TENANT_SERVICE_CARDS } from '@/lib/tenant-services'

export type TenantServicesConfig = Record<string, boolean>

export type LandingPageConfig = {
  heroTitle?: string
  heroSubtitle?: string
  seoTitle?: string
  seoDescription?: string
  customContent?: string
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function toJsonInput(value: unknown) {
  // Prisma's JsonInput requires plain JSON values (no Dates, BigInts, etc).
  return JSON.parse(JSON.stringify(value))
}

function isValidHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value)
}

const MODULE_SERVICE_KEYS = new Set(
  TENANT_SERVICE_CARDS.filter(card => card.isModuleKey).map(card => card.key)
)

const ALLOWED_SERVICE_KEYS = new Set([
  ...TENANT_SERVICE_CARDS.map(card => card.key),
  ...SOCIAL_AUTOMATION_CARDS.map(card => card.key),
])

const REQUIRED_PARENT_MODULE: Record<string, string | undefined> = {
  CHAT: 'SOCIAL',
  YOUTUBE: 'SOCIAL',
  SOCIAL_AUTO_SYNC: 'SOCIAL',
  LEAD_AUTOMATION: 'ADS',
  DATA_SHARING: 'SOCIAL',
}

export async function setTenantServiceEnabledAction(serviceKey: string, enabled: boolean) {
  const session = await getSession()
  if (!session?.tenantId) return { success: false, error: 'Unauthorized' }

  if (session.role !== 'TENANT_ADMIN' && session.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Forbidden' }
  }

  const tenant = await masterDb.tenant.findUnique({
    where: { id: session.tenantId },
    select: { id: true, modules: true, services: true },
  })

  if (!tenant) return { success: false, error: 'Workspace not found' }
  if (!ALLOWED_SERVICE_KEYS.has(serviceKey)) return { success: false, error: 'Unknown service key' }

  const entitledModules = (tenant.modules as string[]) ?? []
  const requiredParentModule = REQUIRED_PARENT_MODULE[serviceKey]
  if (enabled && requiredParentModule && !entitledModules.includes(requiredParentModule)) {
    return { success: false, error: `${serviceKey} requires ${requiredParentModule} to be active.` }
  }

  // Tenant can toggle any key, but module-keys cannot be enabled unless entitled.
  const nextEnabled =
    enabled && MODULE_SERVICE_KEYS.has(serviceKey)
      ? entitledModules.includes(serviceKey)
      : enabled

  const current = isPlainObject(tenant.services) ? (tenant.services as TenantServicesConfig) : {}
  const next: TenantServicesConfig = { ...current, [serviceKey]: nextEnabled }

  await masterDb.tenant.update({
    where: { id: session.tenantId },
    data: { services: toJsonInput(next) },
  })

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/chat')
  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/settings/services')
  revalidatePath('/dashboard/settings/social-marketing')
  return { success: true }
}

export async function updateTenantLandingPageAction(input: {
  logoUrl?: string | null
  tagline?: string | null
  primaryColor?: string | null
  landingPage?: LandingPageConfig | null
}) {
  const session = await getSession()
  if (!session?.tenantId) return { success: false, error: 'Unauthorized' }

  if (session.role !== 'TENANT_ADMIN' && session.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Forbidden' }
  }

  const tenant = await masterDb.tenant.findUnique({
    where: { id: session.tenantId },
    select: { id: true, subdomain: true },
  })

  if (!tenant) return { success: false, error: 'Workspace not found' }

  const logoUrl = typeof input.logoUrl === 'string' ? input.logoUrl.trim() : input.logoUrl
  const tagline = typeof input.tagline === 'string' ? input.tagline.trim() : input.tagline
  const primaryColor = typeof input.primaryColor === 'string' ? input.primaryColor.trim() : input.primaryColor

  const landingPage = isPlainObject(input.landingPage) ? (input.landingPage as LandingPageConfig) : null
  const safeLandingPage: LandingPageConfig | null = landingPage
    ? {
        heroTitle: landingPage.heroTitle?.trim() || undefined,
        heroSubtitle: landingPage.heroSubtitle?.trim() || undefined,
        seoTitle: landingPage.seoTitle?.trim() || undefined,
        seoDescription: landingPage.seoDescription?.trim() || undefined,
        customContent: landingPage.customContent?.trim() || undefined,
      }
    : null

  await masterDb.tenant.update({
    where: { id: session.tenantId },
    data: {
      ...(logoUrl !== undefined ? { logoUrl: logoUrl || null } : {}),
      ...(tagline !== undefined ? { tagline: tagline || null } : {}),
      ...(primaryColor !== undefined
        ? { primaryColor: primaryColor && isValidHexColor(primaryColor) ? primaryColor : '#00B077' }
        : {}),
      ...(input.landingPage !== undefined ? { landingPage: safeLandingPage ? toJsonInput(safeLandingPage) : null } : {}),
    },
  })

  revalidatePath('/dashboard/settings/landing')
  revalidatePath(`/dashboard/settings`)
  revalidatePath(`/dashboard`)
  revalidatePath(`/${tenant.subdomain}`)
  return { success: true }
}
