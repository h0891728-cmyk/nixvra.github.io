import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { masterDb, getTenantDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const days = Math.min(parseInt(req.nextUrl.searchParams.get('days') || '30', 10), 90)
  const tenants = await masterDb.tenant.findMany({
    select: { id: true, name: true, subdomain: true, databaseName: true },
  })

  const now = new Date()
  const startDate = new Date(now.getTime() - days * 86400000)

  // Per-day bucket map
  const dailyMap = new Map<string, {
    date: string
    postsCreated: number
    postsPublished: number
    postsScheduled: number
    postsFailed: number
    adImpressions: number
    adClicks: number
    adSpend: number
    whatsappMessages: number
  }>()

  for (let d = 0; d < days; d++) {
    const dt = new Date(now.getTime() - d * 86400000)
    const key = dt.toISOString().split('T')[0]
    dailyMap.set(key, {
      date: key, postsCreated: 0, postsPublished: 0, postsScheduled: 0,
      postsFailed: 0, adImpressions: 0, adClicks: 0, adSpend: 0, whatsappMessages: 0,
    })
  }

  // Per-tenant aggregation
  const tenantStats: Record<string, unknown>[] = []

  await Promise.all(tenants.map(async (t) => {
    try {
      const db = await getTenantDb(t.databaseName)
      const [posts, campaigns, whatsapp] = await Promise.all([
        db.socialPost.findMany({
          where: { createdAt: { gte: startDate }, deletedAt: null },
          select: { createdAt: true, status: true },
        }),
        db.adCampaign.findMany({
          where: { createdAt: { gte: startDate }, deletedAt: null },
          select: { createdAt: true, metrics: true },
        }),
        db.webhookEvent.findMany({
          where: { source: 'WHATSAPP_CLOUD', createdAt: { gte: startDate }, deletedAt: null },
          select: { createdAt: true },
        }),
      ])

      posts.forEach(p => {
        const key = p.createdAt.toISOString().split('T')[0]
        const bucket = dailyMap.get(key)
        if (bucket) {
          bucket.postsCreated++
          if (p.status === 'PUBLISHED') bucket.postsPublished++
          if (p.status === 'SCHEDULED') bucket.postsScheduled++
          if (p.status === 'FAILED') bucket.postsFailed++
        }
      })

      campaigns.forEach(c => {
        const key = c.createdAt.toISOString().split('T')[0]
        const bucket = dailyMap.get(key)
        if (bucket) {
          const m = (c.metrics || {}) as Record<string, unknown>
          bucket.adImpressions += Number(m.impressions) || 0
          bucket.adClicks += Number(m.clicks) || 0
          bucket.adSpend += Number(m.spent) || 0
        }
      })

      whatsapp.forEach(w => {
        const key = w.createdAt.toISOString().split('T')[0]
        const bucket = dailyMap.get(key)
        if (bucket) bucket.whatsappMessages++
      })

      tenantStats.push({
        tenantId: t.id,
        tenantName: t.name,
        tenantSubdomain: t.subdomain,
        totalPosts: posts.length,
        publishedPosts: posts.filter(p => p.status === 'PUBLISHED').length,
        scheduledPosts: posts.filter(p => p.status === 'SCHEDULED').length,
        totalCampaigns: campaigns.length,
        totalWhatsApp: whatsapp.length,
      })
    } catch (_) { /* ignore unreachable DBs */ }
  }))

  const daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))

  // Platform-wide summary
  const summary = {
    totalPostsCreated: daily.reduce((s, d) => s + d.postsCreated, 0),
    totalPostsPublished: daily.reduce((s, d) => s + d.postsPublished, 0),
    totalPostsScheduled: daily.reduce((s, d) => s + d.postsScheduled, 0),
    totalPostsFailed: daily.reduce((s, d) => s + d.postsFailed, 0),
    totalAdImpressions: daily.reduce((s, d) => s + d.adImpressions, 0),
    totalAdSpend: daily.reduce((s, d) => s + d.adSpend, 0),
    totalWhatsAppMessages: daily.reduce((s, d) => s + d.whatsappMessages, 0),
  }

  return NextResponse.json({ daily, tenantStats, summary, days })
}
