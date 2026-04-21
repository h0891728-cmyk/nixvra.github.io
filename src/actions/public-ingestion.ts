'use server'

import { masterDb, getTenantDb } from '@/lib/db'
import { revalidatePath } from 'next/cache'

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

export type PublicTenantData = {
  id: string
  name: string
  subdomain: string
  industry: string
  tagline: string | null
  logoUrl: string | null
  primaryColor: string
  currency: string
  landingPage: PublicLandingPage | null
  // Entities rendered on the landing page (e.g. Doctors, Teachers, Properties)
  highlights: PublicEntity[]
}

export type PublicLandingPage = {
  heroTitle?: string | null
  heroSubtitle?: string | null
  seoTitle?: string | null
  seoDescription?: string | null
  customContent?: string | null
}

export type PublicEntity = {
  id: string
  name: string
  type: string
  coreTrait: string | null // e.g. "Cardiologist", "Class 5 Teacher", "3BHK Apartment"
  coreValue: string | null // e.g. "₹500", "₹35,000/mo"
  description: string | null
}

export type LeadPayload = {
  name: string
  contact: string
  description?: string
  coreTrait?: string     // e.g. "Interested In" / "Enquiry For"
}

// ─────────────────────────────────────────────────────────────────
// 1. GET TENANT PUBLIC DATA (no auth required — public read)
// ─────────────────────────────────────────────────────────────────

const HIGHLIGHT_ENTITY_TYPES_BY_INDUSTRY: Record<string, string[]> = {
  HEALTHCARE: ['PATIENT', 'STAFF'],        // show Doctors (STAFF) only
  EDUCATION: ['TEACHER', 'GROUP'],         // show Teachers and Classes
  REAL_ESTATE: ['PROPERTY', 'AGENT'],      // show Properties and Agents
  ECOMMERCE: ['VENDOR', 'ASSET'],
  SERVICES: ['STAFF', 'AGENT'],
  OTHER: ['STAFF'],
}

// Which entity types represent "offerings" to display on landing page
const OFFERING_TYPES: Record<string, string[]> = {
  HEALTHCARE: ['STAFF'],      // Doctors are STAFF
  EDUCATION: ['TEACHER', 'GROUP'],
  REAL_ESTATE: ['PROPERTY'],
  ECOMMERCE: ['ASSET'],
  SERVICES: ['STAFF', 'AGENT'],
  OTHER: ['STAFF'],
}

export async function getTenantPublicData(subdomain: string): Promise<PublicTenantData | null> {
  // Lookup tenant from master DB using subdomain
  const tenant = await masterDb.tenant.findFirst({
    where: { subdomain },
    select: {
      id: true,
      name: true,
      subdomain: true,
      industry: true,
      tagline: true,
      logoUrl: true,
      primaryColor: true,
      currency: true,
      landingPage: true,
      databaseName: true,
    },
  })

  if (!tenant) return null

  // Load highlight entities from isolated tenant DB
  const db = await getTenantDb(tenant.databaseName)
  const offeringTypes = OFFERING_TYPES[tenant.industry as string] ?? ['STAFF']

  let highlights: PublicEntity[] = []
  try {
    const entities = await db.businessEntity.findMany({
      where: {
        type: { in: offeringTypes as any },
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
      take: 12,
      select: {
        publicId: true,
        name: true,
        type: true,
        coreTrait: true,
        coreValue: true,
        description: true,
      },
    })

    highlights = entities.map((e: any) => ({
      id: e.publicId,
      name: e.name,
      type: e.type,
      coreTrait: e.coreTrait ?? null,
      coreValue: e.coreValue ? String(e.coreValue) : null,
      description: e.description ?? null,
    }))
  } catch {
    // Tenant DB may be cold — graceful fallback
    highlights = []
  }

  return {
    id: tenant.id,
    name: tenant.name,
    subdomain: tenant.subdomain,
    industry: tenant.industry,
    tagline: tenant.tagline ?? null,
    logoUrl: tenant.logoUrl ?? null,
    primaryColor: tenant.primaryColor ?? '#00B077',
    currency: tenant.currency,
    landingPage: (tenant.landingPage as any) ?? null,
    highlights,
  }
}

// ─────────────────────────────────────────────────────────────────
// 2. CAPTURE PUBLIC LEAD (no auth — public write)
// ─────────────────────────────────────────────────────────────────

export async function capturePublicLead(
  subdomain: string,
  payload: LeadPayload
): Promise<{ success: boolean; message: string }> {
  if (!payload.name?.trim() || !payload.contact?.trim()) {
    return { success: false, message: 'Name and contact are required.' }
  }

  // Basic contact format check
  const contactClean = payload.contact.trim()
  const isEmail = contactClean.includes('@')
  const isPhone = /^\+?[\d\s\-]{7,15}$/.test(contactClean)
  if (!isEmail && !isPhone) {
    return { success: false, message: 'Please enter a valid email or phone number.' }
  }

  // Resolve tenant
  const tenant = await masterDb.tenant.findFirst({
    where: { subdomain },
    select: { id: true, databaseName: true, name: true },
  })

  if (!tenant) return { success: false, message: 'Business not found.' }

  const db = await getTenantDb(tenant.databaseName)

  try {
    // Insert as LEAD entity
    await db.businessEntity.create({
      data: {
        type: 'LEAD' as any,
        name: payload.name.trim(),
        contact: contactClean,
        description: payload.description?.trim() ?? null,
        coreTrait: payload.coreTrait?.trim() ?? 'Public Inquiry',
      },
    })

    // Audit log
    try {
      await db.auditLog.create({
        data: {
          action: 'PUBLIC_LEAD_CAPTURED',
          entityType: 'BusinessEntity',
          entityId: subdomain,
          userId: 'public',
          details: {
            name: payload.name.trim(),
            contact: contactClean,
            source: 'landing_page',
            tenant: tenant.name,
          },
        },
      })
    } catch {
      // audit is non-critical
    }

  revalidatePath('/dashboard/modules')
    return { success: true, message: 'Thank you! We will get back to you shortly.' }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to capture lead.'
    console.error('[capturePublicLead]', msg)
    return { success: false, message: 'Something went wrong. Please try again.' }
  }
}

// ─────────────────────────────────────────────────────────────────
// 3. UPDATE TENANT BRANDING (Super Admin only — called from tenant panel)
// ─────────────────────────────────────────────────────────────────

export async function updateTenantBranding(
  tenantId: string,
  data: { logoUrl?: string; tagline?: string; primaryColor?: string }
): Promise<{ success: boolean }> {
  await masterDb.tenant.update({
    where: { id: tenantId },
    data: {
      logoUrl: data.logoUrl ?? undefined,
      tagline: data.tagline ?? undefined,
      primaryColor: data.primaryColor ?? undefined,
    },
  })
  revalidatePath(`/super-admin/tenants/${tenantId}`)
  return { success: true }
}
