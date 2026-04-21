'use server'

import { masterDb, getTenantDb } from '@/lib/db'

// Helper to fetch all active tenants
async function getAllTenants() {
  return masterDb.tenant.findMany({
    select: { id: true, name: true, subdomain: true, databaseName: true }
  })
}

/* ═══════════════════════════════════════════════════════════════
   GLOBAL SOCIAL POSTS
   ═══════════════════════════════════════════════════════════════ */
export async function getGlobalSocialPosts() {
  const tenants = await getAllTenants()
  const results: any[] = []

  const promises = tenants.map(async (t) => {
    try {
      const db = await getTenantDb(t.databaseName)
      const posts = await db.socialPost.findMany({
        where: { deletedAt: null },
        take: 30,
        orderBy: { createdAt: 'desc' }
      })
      posts.forEach(p => {
        results.push({ ...p, id: String(p.id), tenant: { id: t.id, name: t.name, subdomain: t.subdomain } })
      })
    } catch (_) { /* ignore failing DBs */ }
  })

  await Promise.all(promises)
  return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

/* ═══════════════════════════════════════════════════════════════
   GLOBAL AD CAMPAIGNS
   ═══════════════════════════════════════════════════════════════ */
export async function getGlobalAdCampaigns() {
  const tenants = await getAllTenants()
  const results: any[] = []

  const promises = tenants.map(async (t) => {
    try {
      const db = await getTenantDb(t.databaseName)
      const campaigns = await db.adCampaign.findMany({
        where: { deletedAt: null },
        take: 30,
        orderBy: { createdAt: 'desc' }
      })
      campaigns.forEach(c => {
        results.push({ ...c, id: String(c.id), tenant: { id: t.id, name: t.name, subdomain: t.subdomain } })
      })
    } catch (_) { /* ignore failing DBs */ }
  })

  await Promise.all(promises)
  return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

/* ═══════════════════════════════════════════════════════════════
   GLOBAL WHATSAPP MESSAGES & BROADCASTS
   ═══════════════════════════════════════════════════════════════ */
export async function getGlobalWhatsAppEvents() {
  const tenants = await getAllTenants()
  const results: any[] = []

  const promises = tenants.map(async (t) => {
    try {
      const db = await getTenantDb(t.databaseName)
      const events = await db.webhookEvent.findMany({
        where: { source: 'WHATSAPP_CLOUD', deletedAt: null },
        take: 50,
        orderBy: { createdAt: 'desc' }
      })
      events.forEach(e => {
        results.push({ ...e, id: String(e.id), tenant: { id: t.id, name: t.name, subdomain: t.subdomain } })
      })
    } catch (_) { /* ignore failing DBs */ }
  })

  await Promise.all(promises)
  return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

/* ═══════════════════════════════════════════════════════════════
   GLOBAL SOCIAL ANALYTICS (CROSS-TENANT CHARTING)
   ═══════════════════════════════════════════════════════════════ */
export type SocialDailyStat = {
  date: string
  postsCreated: number
  adImpressions: number
  adSpend: number
}

export async function getGlobalSocialAnalytics(days: number = 30): Promise<SocialDailyStat[]> {
  const tenants = await getAllTenants()
  const now = new Date()
  const statsMap = new Map<string, SocialDailyStat>()

  for (let d = 0; d < days; d++) {
    const targetDate = new Date(now.getTime() - d * 24 * 60 * 60 * 1000)
    const key = targetDate.toISOString().split('T')[0]
    statsMap.set(key, { date: key, postsCreated: 0, adImpressions: 0, adSpend: 0 })
  }

  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

  const promises = tenants.map(async (t) => {
    try {
      const db = await getTenantDb(t.databaseName)
      const [posts, campaigns] = await Promise.all([
        db.socialPost.findMany({
          where: { createdAt: { gte: startDate }, deletedAt: null },
          select: { createdAt: true }
        }),
        db.adCampaign.findMany({
          where: { createdAt: { gte: startDate }, deletedAt: null },
          select: { createdAt: true, metrics: true }
        })
      ])

      posts.forEach(p => {
        const key = p.createdAt.toISOString().split('T')[0]
        const bucket = statsMap.get(key)
        if (bucket) bucket.postsCreated += 1
      })

      campaigns.forEach(c => {
        const key = c.createdAt.toISOString().split('T')[0]
        const bucket = statsMap.get(key)
        if (bucket) {
          const metrics: any = c.metrics || {}
          bucket.adImpressions += (Number(metrics.impressions) || 0)
          bucket.adSpend += (Number(metrics.spent) || 0)
        }
      })
    } catch (_) {}
  })

  await Promise.all(promises)
  return Array.from(statsMap.values()).sort((a, b) => a.date.localeCompare(b.date))
}

/* ═══════════════════════════════════════════════════════════════
   ALL TENANTS LIST (for composer dropdown)
   ═══════════════════════════════════════════════════════════════ */
export async function getAllTenantsForSocial() {
  return masterDb.tenant.findMany({
    select: { id: true, name: true, subdomain: true, industry: true, databaseName: true },
    orderBy: { name: 'asc' },
  })
}

/* ═══════════════════════════════════════════════════════════════
   CALENDAR: ALL SCHEDULED POSTS (platform-wide)
   ═══════════════════════════════════════════════════════════════ */
export type CalendarPost = {
  publicId: string
  caption: string | null
  platforms: string[]
  status: string
  scheduledFor: string
  createdAt: string
  tenant: { id: string; name: string; subdomain: string }
}

export async function getScheduledPostsForCalendar(): Promise<CalendarPost[]> {
  const tenants = await getAllTenants()
  const results: CalendarPost[] = []

  const now = new Date()
  const rangeStart = new Date(now.getTime() - 7 * 86400000)   // 7 days ago
  const rangeEnd   = new Date(now.getTime() + 60 * 86400000)  // 60 days ahead

  await Promise.all(tenants.map(async (t) => {
    try {
      const db = await getTenantDb(t.databaseName)
      const posts = await db.socialPost.findMany({
        where: {
          deletedAt: null,
          OR: [
            { scheduledFor: { gte: rangeStart, lte: rangeEnd } },
            { status: 'SCHEDULED' },
          ],
        },
        select: {
          publicId: true, caption: true, platforms: true,
          status: true, scheduledFor: true, createdAt: true,
        },
        orderBy: { scheduledFor: 'asc' },
      })

      posts.forEach(p => {
        results.push({
          ...p,
          platforms: Array.isArray(p.platforms) ? (p.platforms as string[]) : [],
          scheduledFor: p.scheduledFor ? p.scheduledFor.toISOString() : p.createdAt.toISOString(),
          createdAt: p.createdAt.toISOString(),
          tenant: { id: t.id, name: t.name, subdomain: t.subdomain },
        })
      })
    } catch (_) {}
  }))

  return results.sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))
}

/* ═══════════════════════════════════════════════════════════════
   SOCIAL ACCOUNTS (all connected integrations)
   ═══════════════════════════════════════════════════════════════ */
export type SocialAccount = {
  tenantId: string
  tenantName: string
  tenantSubdomain: string
  provider: string
  isActive: boolean
  accountName: string | null
  pageCount: number
  connectedAt: string | null
}

export async function getGlobalSocialAccounts(): Promise<SocialAccount[]> {
  const tenants = await getAllTenants()
  const accounts: SocialAccount[] = []

  await Promise.all(tenants.map(async (t) => {
    try {
      const db = await getTenantDb(t.databaseName)
      const integrations = await db.tenantIntegration.findMany({
        where: {
          provider: { in: ['META_GRAPH', 'WHATSAPP_CLOUD'] as never[] },
          deletedAt: null,
        },
        select: { provider: true, isActive: true, metadata: true, createdAt: true },
      })

      integrations.forEach(i => {
        const meta = (i.metadata || {}) as Record<string, unknown>
        const pages = (meta.pages as unknown[]) || []
        accounts.push({
          tenantId: t.id,
          tenantName: t.name,
          tenantSubdomain: t.subdomain,
          provider: i.provider,
          isActive: i.isActive,
          accountName: (meta.accountName as string) || null,
          pageCount: pages.length,
          connectedAt: i.createdAt ? i.createdAt.toISOString() : null,
        })
      })
    } catch (_) {}
  }))

  return accounts
}

/* ═══════════════════════════════════════════════════════════════
   BULK OPERATIONS
   ═══════════════════════════════════════════════════════════════ */
export async function bulkDeleteSocialPosts(
  items: { tenantId: string; publicId: string }[]
) {
  const results = await Promise.allSettled(items.map(async ({ tenantId, publicId }) => {
    const tenant = await masterDb.tenant.findUnique({
      where: { id: tenantId }, select: { databaseName: true },
    })
    if (!tenant) throw new Error(`Tenant ${tenantId} not found`)
    const db = await getTenantDb(tenant.databaseName)
    await db.socialPost.update({ where: { publicId }, data: { deletedAt: new Date() } })
    return publicId
  }))

  const deleted = results.filter(r => r.status === 'fulfilled').length
  const failed  = results.filter(r => r.status === 'rejected').length
  return { deleted, failed, total: items.length }
}

/* ═══════════════════════════════════════════════════════════════
   CREATE POST FOR MULTIPLE TENANTS AT ONCE
   ═══════════════════════════════════════════════════════════════ */
export async function createMultiTenantPost(
  tenantIds: string[],
  data: {
    platforms: string[]
    caption: string
    mediaUrl?: string
    scheduledFor?: string
    metadata?: Record<string, unknown>
  }
) {
  const results = await Promise.allSettled(tenantIds.map(async (tenantId) => {
    const tenant = await masterDb.tenant.findUnique({
      where: { id: tenantId }, select: { databaseName: true, name: true },
    })
    if (!tenant) throw new Error(`Tenant ${tenantId} not found`)
    const db = await getTenantDb(tenant.databaseName)
    return db.socialPost.create({
      data: {
        platforms: data.platforms,
        caption: data.caption,
        mediaUrl: data.mediaUrl || '',
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
        status: data.scheduledFor ? 'SCHEDULED' : 'DRAFT',
        metadata: (data.metadata || {}) as never,
      },
    })
  }))

  const created = results.filter(r => r.status === 'fulfilled').length
  const errors  = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map(r => r.reason instanceof Error ? r.reason.message : String(r.reason))

  return { created, errors, total: tenantIds.length }
}

