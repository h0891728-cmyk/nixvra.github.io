'use server'

import { masterDb } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'crypto'
import dns from 'dns/promises'
import { addDomainToVercel, getDomainConfig, removeDomainFromVercel, checkDomainVercelStatus } from '@/lib/vercel-dns'
import { searchDomain, checkDomainAvailability, autoProvisionDomain } from '@/lib/namecom-api'

// ── REQUEST DOMAIN (External DNS) ─────────────────────────────────────────────
export async function requestDomainAction(tenantId: string, formData: FormData) {
  const domain = (formData.get('domain') as string).trim().toLowerCase()
    .replace(/^https?:\/\//i, '').replace(/\/.*$/, '')

  if (!domain || !/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/.test(domain)) {
    throw new Error('Invalid domain name')
  }

  const existing = await masterDb.tenantDomain.findUnique({ where: { domain } })
  if (existing) throw new Error('This domain is already registered')

  const verifyToken = `omnicore-verify=${randomBytes(16).toString('hex')}`

  await masterDb.tenantDomain.create({
    data: {
      tenantId,
      domain,
      type: 'PRIMARY',
      status: 'PENDING_APPROVAL',
      verifyToken,
      dnsTarget: 'cname.vercel-dns.com',
      source: 'EXTERNAL',
    },
  })

  revalidatePath(`/super-admin/tenants/${tenantId}`)
  revalidatePath('/super-admin/domains')
}

// ── ADD VERCEL DOMAIN (Super Admin — with Vercel API) ────────────────────────
// Used when Super Admin directly adds a domain through the Domain Center
export async function addVercelDomainAction(tenantId: string, domain: string): Promise<{
  success: boolean
  error?: string
  vercelRequiredRecords?: any[]
}> {
  const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/\/.*$/, '')

  if (!cleanDomain || !/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/.test(cleanDomain)) {
    return { success: false, error: 'Invalid domain name' }
  }

  const existing = await masterDb.tenantDomain.findUnique({ where: { domain: cleanDomain } })
  if (existing) return { success: false, error: 'Domain already registered in Nixvra' }

  // Step 1: Add to Vercel
  const vercelResult = await addDomainToVercel(cleanDomain)
  if (!vercelResult.success) {
    // Domain already on Vercel is OK (code: domain_already_in_use or similar)
    const ignorable = vercelResult.code === 'domain_already_in_use'
    if (!ignorable) {
      return { success: false, error: `Vercel: ${vercelResult.error}` }
    }
  }

  // Step 2: Get required DNS records from Vercel
  const configResult = await getDomainConfig(cleanDomain)
  const requiredRecords = configResult.success ? configResult.requiredRecords : []

  // Step 3: Save to DB (APPROVED — Super Admin directly added it)
  const verifyToken = `omnicore-verify=${randomBytes(16).toString('hex')}`
  await masterDb.tenantDomain.create({
    data: {
      tenantId,
      domain: cleanDomain,
      type: 'PRIMARY',
      status: 'APPROVED',
      verifyToken,
      dnsTarget: 'cname.vercel-dns.com',
      source: 'EXTERNAL',
      approvedAt: new Date(),
    },
  })

  revalidatePath(`/super-admin/tenants/${tenantId}`)
  revalidatePath('/super-admin/domains')

  return { success: true, vercelRequiredRecords: requiredRecords }
}

// ── SEARCH NAME.COM DOMAINS ───────────────────────────────────────────────────
export async function searchNamecomDomainsAction(query: string) {
  return await searchDomain(query)
}

// ── CHECK SINGLE DOMAIN AVAILABILITY ─────────────────────────────────────────
export async function checkNamecomAvailabilityAction(domain: string) {
  return await checkDomainAvailability(domain)
}

// ── PURCHASE + AUTO-PROVISION FROM NAME.COM ───────────────────────────────────
export async function purchaseNamecomDomainAction(tenantId: string, domain: string): Promise<{
  success: boolean
  error?: string
  orderId?: string
  dnsConfigured?: boolean
  dnsErrors?: string[]
}> {
  const cleanDomain = domain.trim().toLowerCase()

  // Check not already in DB
  const existing = await masterDb.tenantDomain.findUnique({ where: { domain: cleanDomain } })
  if (existing) return { success: false, error: 'Domain already registered in Nixvra' }

  const verifyToken = `omnicore-verify=${randomBytes(16).toString('hex')}`

  // Step 1: Pre-check price (required safeguards for Name.com API)
  const check = await checkDomainAvailability(cleanDomain)
  if (!check.available || !check.purchasePrice) {
    return { success: false, error: 'Domain is no longer available or price could not be verified' }
  }

  // Step 2: Purchase + Auto-DNS via Name.com
  const provision = await autoProvisionDomain(cleanDomain, check.purchasePrice, verifyToken)
  if (!provision.success) {
    return { success: false, error: provision.errors[0] ?? 'Purchase failed' }
  }

  // Step 3: Add to Vercel project
  await addDomainToVercel(cleanDomain)

  // Step 3: Save to DB — mark ACTIVE since DNS is auto-configured
  await masterDb.tenantDomain.create({
    data: {
      tenantId,
      domain: cleanDomain,
      type: 'PRIMARY',
      status: 'ACTIVE',
      verifyToken,
      dnsTarget: 'cname.vercel-dns.com',
      source: 'NAMECOM',
      registrar: 'name.com',
      autoConfigured: true,
      namecomOrderId: provision.orderId,
      purchasedAt: new Date(),
      approvedAt: new Date(),
      verifiedAt: provision.dnsConfigured ? new Date() : null,
      sslStatus: 'PENDING', // SSL provisions asynchronously by Vercel
    },
  })

  revalidatePath(`/super-admin/tenants/${tenantId}`)
  revalidatePath('/super-admin/domains')

  return {
    success: true,
    orderId: provision.orderId,
    dnsConfigured: provision.dnsConfigured,
    dnsErrors: provision.errors,
  }
}

// ── APPROVE DOMAIN ────────────────────────────────────────────────────────────
export async function approveDomainAction(domainId: string) {
  const record = await masterDb.tenantDomain.findUnique({ where: { id: domainId } })
  if (!record) throw new Error('Domain not found')

  // Add to Vercel if not already done
  await addDomainToVercel(record.domain)

  // Get required DNS records from Vercel to show user
  const configResult = await getDomainConfig(record.domain)

  await masterDb.tenantDomain.update({
    where: { id: domainId },
    data: {
      status: 'APPROVED',
      approvedAt: new Date(),
    },
  })

  revalidatePath('/super-admin/domains')
  revalidatePath(`/super-admin/tenants/${record.tenantId}`)

  return {
    requiredRecords: configResult.success ? configResult.requiredRecords : [],
  }
}

// ── REJECT DOMAIN ─────────────────────────────────────────────────────────────
export async function rejectDomainAction(domainId: string, reason: string) {
  const record = await masterDb.tenantDomain.findUnique({ where: { id: domainId } })
  await masterDb.tenantDomain.update({
    where: { id: domainId },
    data: {
      status: 'REJECTED',
      rejectedAt: new Date(),
      rejectionReason: reason,
    },
  })
  revalidatePath('/super-admin/domains')
  if (record) revalidatePath(`/super-admin/tenants/${record.tenantId}`)
}

// ── VERIFY DNS — Dual check: Node DNS + Vercel API ────────────────────────────
export async function verifyDomainDnsAction(domainId: string) {
  const record = await masterDb.tenantDomain.findUnique({ where: { id: domainId } })
  if (!record) throw new Error('Domain not found')

  let dnsVerified = false
  let txtVerified = false
  let vercelVerified = false

  // Check 1: Node DNS — CNAME
  try {
    const cnameResult = await dns.resolveCname(record.domain).catch(() => null)
    dnsVerified = Array.isArray(cnameResult) && cnameResult.some(c =>
      c.includes('vercel') || c.includes('omnicore')
    )
  } catch (_) {}

  // Check 2: Node DNS — TXT token
  try {
    const txtResult = await dns.resolveTxt(record.domain).catch(() => null)
    if (Array.isArray(txtResult)) {
      txtVerified = txtResult.flat().some(t => t === record.verifyToken)
    }
  } catch (_) {}

  // Check 3: Vercel API — live status
  try {
    const vercelStatus = await checkDomainVercelStatus(record.domain)
    vercelVerified = vercelStatus.verified
  } catch (_) {}

  const verified = dnsVerified || txtVerified || vercelVerified

  await masterDb.tenantDomain.update({
    where: { id: domainId },
    data: {
      status: verified ? 'ACTIVE' : 'FAILED',
      sslStatus: verified ? 'ACTIVE' : 'PENDING',
      verifiedAt: verified ? new Date() : null,
    },
  })

  revalidatePath('/super-admin/domains')
  if (record) revalidatePath(`/super-admin/tenants/${record.tenantId}`)

  return { verified, dnsVerified, txtVerified, vercelVerified }
}

// ── SYNC VERCEL STATUS ────────────────────────────────────────────────────────
// Fetch live Vercel config and return required DNS records
export async function syncVercelStatusAction(domainId: string) {
  const record = await masterDb.tenantDomain.findUnique({ where: { id: domainId } })
  if (!record) return { success: false, error: 'Domain not found' }

  const result = await getDomainConfig(record.domain)
  if (!result.success) return { success: false, error: result.error }

  return {
    success: true,
    misconfigured: result.config.misconfigured,
    configuredBy: result.config.configuredBy,
    requiredRecords: result.requiredRecords,
  }
}

// ── REMOVE DOMAIN ─────────────────────────────────────────────────────────────
export async function removeDomainAction(domainId: string, tenantId: string) {
  const record = await masterDb.tenantDomain.findUnique({ where: { id: domainId } })
  if (record) {
    // Remove from Vercel (best-effort, don't block on failure)
    await removeDomainFromVercel(record.domain).catch(() => {})
  }
  await masterDb.tenantDomain.delete({ where: { id: domainId } })
  revalidatePath(`/super-admin/tenants/${tenantId}`)
  revalidatePath('/super-admin/domains')
}

// ── SET PRIMARY ───────────────────────────────────────────────────────────────
export async function setPrimaryDomainAction(domainId: string, tenantId: string) {
  await masterDb.tenantDomain.updateMany({
    where: { tenantId },
    data: { type: 'ALIAS' },
  })
  await masterDb.tenantDomain.update({
    where: { id: domainId },
    data: { type: 'PRIMARY' },
  })
  revalidatePath(`/super-admin/tenants/${tenantId}`)
  revalidatePath('/super-admin/domains')
}
