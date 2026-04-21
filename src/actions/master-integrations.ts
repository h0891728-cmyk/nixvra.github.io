'use server'

import { masterDb, getTenantDb } from '@/lib/db'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */
export type PlatformType =
  | 'META_GRAPH' | 'WHATSAPP_CLOUD'
  | 'YOUTUBE_DATA' | 'TWITTER' | 'LINKEDIN'
  | 'SMTP' | 'GMAIL' | 'IVRS'

export type IntegrationRow = {
  publicId: string
  provider: string
  isActive: boolean
  apiKey: string | null
  accessToken: string | null
  refreshToken: string | null
  webhookUrl: string | null
  metadata: unknown
  createdAt: Date
  updatedAt: Date
}

export type TenantIntegrationSummary = {
  tenantId: string
  tenantName: string
  tenantSubdomain: string
  provider: string
  isActive: boolean
  connectedAt: string | null
  hasToken: boolean
  hasKey: boolean
}

/* ═══════════════════════════════════════════════════════════════
   HELPER — write audit log (non-critical)
   ═══════════════════════════════════════════════════════════════ */
async function writeAudit(
  databaseName: string,
  action: string,
  entityId: string,
  userId: string,
  details: any
) {
  try {
    const db = await getTenantDb(databaseName)
    await db.auditLog.create({
      data: { action, entityType: 'TenantIntegration', entityId, userId, details },
    })
  } catch (_) { /* audit is non-critical */ }
}

/* ═══════════════════════════════════════════════════════════════
   1. LIST ALL TENANT INTEGRATIONS (Super Admin aggregation)
   ═══════════════════════════════════════════════════════════════ */
export async function listAllIntegrations(): Promise<TenantIntegrationSummary[]> {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') throw new Error('Unauthorized')

  const tenants = await masterDb.tenant.findMany({
    select: { id: true, name: true, subdomain: true, databaseName: true },
    orderBy: { name: 'asc' },
  })

  const results: TenantIntegrationSummary[] = []

  await Promise.all(tenants.map(async (t) => {
    try {
      const db = await getTenantDb(t.databaseName)
      const rows = await db.tenantIntegration.findMany({
        where: { deletedAt: null },
        select: { provider: true, isActive: true, apiKey: true, accessToken: true, createdAt: true },
      })
      rows.forEach(r => {
        results.push({
          tenantId: t.id,
          tenantName: t.name,
          tenantSubdomain: t.subdomain,
          provider: r.provider,
          isActive: r.isActive,
          connectedAt: r.createdAt ? r.createdAt.toISOString() : null,
          hasToken: !!r.accessToken,
          hasKey: !!r.apiKey,
        })
      })
    } catch (_) { /* ignore unreachable tenant DBs */ }
  }))

  return results
}

/* ═══════════════════════════════════════════════════════════════
   2. GET SINGLE PLATFORM STATUS for a specific tenant
   ═══════════════════════════════════════════════════════════════ */
export async function getIntegrationForTenant(
  tenantId: string,
  platform: PlatformType
): Promise<{ exists: boolean; isActive: boolean; connectedAt: string | null; hasToken: boolean; hasKey: boolean; metadata: unknown }> {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  // Tenant users can only check their own
  if (session.role !== 'SUPER_ADMIN' && session.tenantId !== tenantId) throw new Error('Forbidden')

  const tenant = await masterDb.tenant.findUnique({
    where: { id: tenantId },
    select: { databaseName: true },
  })
  if (!tenant) throw new Error('Tenant not found')

  const db = await getTenantDb(tenant.databaseName)
  const row = await db.tenantIntegration.findUnique({
    where: { provider: platform as never },
  })

  if (!row) return { exists: false, isActive: false, connectedAt: null, hasToken: false, hasKey: false, metadata: null }

  return {
    exists: true,
    isActive: row.isActive,
    connectedAt: row.createdAt.toISOString(),
    hasToken: !!row.accessToken,
    hasKey: !!row.apiKey,
    metadata: row.metadata,
  }
}

/* ═══════════════════════════════════════════════════════════════
   3. CONNECT / UPSERT an integration
      Handles both OAuth tokens and plain API key / SMTP creds
   ═══════════════════════════════════════════════════════════════ */
export type ConnectPayload = {
  tenantId: string
  platform: PlatformType
  // OAuth
  accessToken?: string
  refreshToken?: string
  // API Key
  apiKey?: string
  // SMTP / shared
  webhookUrl?: string
  // JSON metadata: host, port, from, clientId, channelId, etc.
  metadata?: Record<string, unknown>
}

export async function connectIntegration(payload: ConnectPayload): Promise<{ success: boolean; message: string }> {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  if (session.role !== 'SUPER_ADMIN' && session.tenantId !== payload.tenantId) throw new Error('Forbidden')

  const tenant = await masterDb.tenant.findUnique({
    where: { id: payload.tenantId },
    select: { databaseName: true, name: true },
  })
  if (!tenant) return { success: false, message: 'Tenant not found' }

  const db = await getTenantDb(tenant.databaseName)

  // Don't overwrite secret if placeholder is passed
  const existing = await db.tenantIntegration.findUnique({ where: { provider: payload.platform as never } })
  const safeToken = payload.accessToken?.includes('****') ? existing?.accessToken : (payload.accessToken || null)
  const safeRefresh = payload.refreshToken?.includes('****') ? existing?.refreshToken : (payload.refreshToken || null)
  const safeKey = payload.apiKey?.includes('****') ? existing?.apiKey : (payload.apiKey || null)

  await db.tenantIntegration.upsert({
    where: { provider: payload.platform as never },
    update: {
      accessToken: safeToken,
      refreshToken: safeRefresh,
      apiKey: safeKey,
      webhookUrl: payload.webhookUrl || existing?.webhookUrl || null,
      metadata: (payload.metadata ?? existing?.metadata ?? null) as never,
      isActive: true,
      deletedAt: null,
    },
    create: {
      provider: payload.platform as never,
      accessToken: safeToken,
      refreshToken: safeRefresh,
      apiKey: safeKey,
      webhookUrl: payload.webhookUrl || null,
      metadata: (payload.metadata ?? null) as never,
      isActive: true,
    },
  })

  await writeAudit(tenant.databaseName, 'INTEGRATION_CONNECTED', payload.platform, session.email, {
    platform: payload.platform, tenantName: tenant.name, by: session.email,
  })

  revalidatePath('/super-admin/integrations')
  revalidatePath('/super-admin/integrations/master')
  revalidatePath('/dashboard/integrations')

  return { success: true, message: `${payload.platform} connected successfully` }
}

/* ═══════════════════════════════════════════════════════════════
   4. DISCONNECT an integration (soft delete via isActive=false)
   ═══════════════════════════════════════════════════════════════ */
export async function disconnectIntegration(
  tenantId: string,
  platform: PlatformType
): Promise<{ success: boolean; message: string }> {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  if (session.role !== 'SUPER_ADMIN' && session.tenantId !== tenantId) throw new Error('Forbidden')

  const tenant = await masterDb.tenant.findUnique({
    where: { id: tenantId },
    select: { databaseName: true, name: true },
  })
  if (!tenant) return { success: false, message: 'Tenant not found' }

  const db = await getTenantDb(tenant.databaseName)

  try {
    await db.tenantIntegration.update({
      where: { provider: platform as never },
      data: {
        isActive: false,
        accessToken: null,
        refreshToken: null,
        apiKey: null,
        deletedAt: new Date(),
      },
    })
  } catch {
    return { success: false, message: `No ${platform} integration found` }
  }

  await writeAudit(tenant.databaseName, 'INTEGRATION_DISCONNECTED', platform, session.email, {
    platform, tenantName: tenant.name, by: session.email,
  })

  revalidatePath('/super-admin/integrations')
  revalidatePath('/super-admin/integrations/master')
  revalidatePath('/dashboard/integrations')

  return { success: true, message: `${platform} disconnected` }
}

/* ═══════════════════════════════════════════════════════════════
   5. TEST CONNECTIVITY  
      Lightweight checks — validates credentials by calling public API endpoints
   ═══════════════════════════════════════════════════════════════ */
export type TestResult = {
  platform: PlatformType
  ok: boolean
  message: string
  latencyMs?: number
}

export async function testIntegration(
  tenantId: string,
  platform: PlatformType
): Promise<TestResult> {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  if (session.role !== 'SUPER_ADMIN' && session.tenantId !== tenantId) throw new Error('Forbidden')

  const tenant = await masterDb.tenant.findUnique({
    where: { id: tenantId },
    select: { databaseName: true },
  })
  if (!tenant) return { platform, ok: false, message: 'Tenant not found' }

  const db = await getTenantDb(tenant.databaseName)
  const row = await db.tenantIntegration.findUnique({ where: { provider: platform as never } })

  if (!row || !row.isActive) return { platform, ok: false, message: 'Integration not connected' }

  const start = Date.now()
  try {
    switch (platform) {
      case 'YOUTUBE_DATA': {
        if (!row.apiKey) return { platform, ok: false, message: 'No API key configured' }
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=id&mine=true&key=${row.apiKey}`,
          { signal: AbortSignal.timeout(5000) }
        )
        return { platform, ok: res.ok, message: res.ok ? 'YouTube API key valid' : `YouTube: HTTP ${res.status}`, latencyMs: Date.now() - start }
      }
      case 'TWITTER': {
        if (!row.accessToken) return { platform, ok: false, message: 'No Bearer Token configured' }
        const res = await fetch('https://api.twitter.com/2/users/me', {
          headers: { Authorization: `Bearer ${row.accessToken}` },
          signal: AbortSignal.timeout(5000),
        })
        return { platform, ok: res.ok, message: res.ok ? 'X/Twitter Bearer Token valid' : `Twitter: HTTP ${res.status}`, latencyMs: Date.now() - start }
      }
      case 'LINKEDIN': {
        if (!row.accessToken) return { platform, ok: false, message: 'No Access Token configured' }
        const res = await fetch('https://api.linkedin.com/v2/me', {
          headers: { Authorization: `Bearer ${row.accessToken}` },
          signal: AbortSignal.timeout(5000),
        })
        return { platform, ok: res.ok, message: res.ok ? 'LinkedIn token valid' : `LinkedIn: HTTP ${res.status}`, latencyMs: Date.now() - start }
      }
      case 'SMTP': {
        const meta = (row.metadata || {}) as Record<string, unknown>
        const host = meta.host as string
        const port = Number(meta.port) || 587
        if (!host) return { platform, ok: false, message: 'SMTP host not configured' }
        // Port reachability test via TCP (as HTTP is not TCP but we approximate)
        return { platform, ok: true, message: `SMTP config present: ${host}:${port} (live SMTP test requires nodemailer)`, latencyMs: Date.now() - start }
      }
      case 'GMAIL': {
        if (!row.accessToken) return { platform, ok: false, message: 'No Gmail OAuth token configured' }
        const res = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
          headers: { Authorization: `Bearer ${row.accessToken}` },
          signal: AbortSignal.timeout(5000),
        })
        return { platform, ok: res.ok, message: res.ok ? 'Gmail OAuth token valid' : `Gmail: HTTP ${res.status}`, latencyMs: Date.now() - start }
      }
      case 'IVRS': {
        const meta = (row.metadata || {}) as Record<string, unknown>
        const provider = meta.provider as string || 'Unknown'
        return { platform, ok: true, message: `IVRS config present — Provider: ${provider} (live call test not available)`, latencyMs: Date.now() - start }
      }
      case 'META_GRAPH': {
        if (!row.accessToken) return { platform, ok: false, message: 'No access token' }
        const res = await fetch(`https://graph.facebook.com/me?access_token=${row.accessToken}`, {
          signal: AbortSignal.timeout(5000),
        })
        return { platform, ok: res.ok, message: res.ok ? 'Meta token valid' : `Meta: HTTP ${res.status}`, latencyMs: Date.now() - start }
      }
      case 'WHATSAPP_CLOUD': {
        if (!row.accessToken || !row.apiKey) return { platform, ok: false, message: 'Token or Phone Number ID missing' }
        const res = await fetch(
          `https://graph.facebook.com/v19.0/${row.apiKey}?access_token=${row.accessToken}`,
          { signal: AbortSignal.timeout(5000) }
        )
        return { platform, ok: res.ok, message: res.ok ? 'WhatsApp number valid' : `WhatsApp: HTTP ${res.status}`, latencyMs: Date.now() - start }
      }
      default:
        return { platform, ok: false, message: 'Test not implemented for this platform' }
    }
  } catch (err: unknown) {
    return {
      platform, ok: false,
      message: err instanceof Error ? err.message : 'Connection test failed',
      latencyMs: Date.now() - start,
    }
  }
}

/* ═══════════════════════════════════════════════════════════════
   6. GET ALL INTEGRATIONS FOR ONE TENANT (Tenant-side)
   ═══════════════════════════════════════════════════════════════ */
export type TenantPlatformStatus = {
  provider: string
  isActive: boolean
  hasToken: boolean
  hasKey: boolean
  metadata: unknown
  connectedAt: string | null
}

export async function getTenantIntegrations(tenantId: string): Promise<TenantPlatformStatus[]> {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  if (session.role !== 'SUPER_ADMIN' && session.tenantId !== tenantId) throw new Error('Forbidden')

  const tenant = await masterDb.tenant.findUnique({
    where: { id: tenantId },
    select: { databaseName: true },
  })
  if (!tenant) return []

  const db = await getTenantDb(tenant.databaseName)
  const rows = await db.tenantIntegration.findMany({ where: { deletedAt: null } })

  return rows.map(r => ({
    provider: r.provider,
    isActive: r.isActive,
    hasToken: !!r.accessToken,
    hasKey: !!r.apiKey,
    metadata: r.metadata,
    connectedAt: r.createdAt.toISOString(),
  }))
}

/* ═══════════════════════════════════════════════════════════════
   7. TOGGLE ACTIVE STATE
   ═══════════════════════════════════════════════════════════════ */
export async function toggleIntegration(
  tenantId: string,
  platform: PlatformType,
  isActive: boolean
): Promise<{ success: boolean }> {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  if (session.role !== 'SUPER_ADMIN' && session.tenantId !== tenantId) throw new Error('Forbidden')

  const tenant = await masterDb.tenant.findUnique({
    where: { id: tenantId },
    select: { databaseName: true },
  })
  if (!tenant) return { success: false }

  const db = await getTenantDb(tenant.databaseName)
  await db.tenantIntegration.update({
    where: { provider: platform as never },
    data: { isActive },
  })

  revalidatePath('/super-admin/integrations/master')
  revalidatePath('/dashboard/integrations')
  return { success: true }
}

/* ═══════════════════════════════════════════════════════════════
   8. GET GLOBAL PLATFORM SUMMARY
      Used for Overview tab KPI cards
   ═══════════════════════════════════════════════════════════════ */
export type PlatformSummary = {
  provider: string
  totalConnected: number
  totalActive: number
  tenants: string[]
}

export async function getGlobalIntegrationSummary(): Promise<PlatformSummary[]> {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') throw new Error('Unauthorized')

  const all = await listAllIntegrations()
  const map = new Map<string, PlatformSummary>()

  all.forEach(row => {
    if (!map.has(row.provider)) {
      map.set(row.provider, { provider: row.provider, totalConnected: 0, totalActive: 0, tenants: [] })
    }
    const entry = map.get(row.provider)!
    entry.totalConnected++
    if (row.isActive) entry.totalActive++
    entry.tenants.push(row.tenantName)
  })

  return Array.from(map.values()).sort((a, b) => b.totalConnected - a.totalConnected)
}
