'use server'

import { getSession } from '@/lib/session'
import { getTenantDb } from '@/lib/db'

function getNumericMetric(metadata: any, key: string) {
  const value = metadata?.[key]
  return Number.isFinite(Number(value)) ? Number(value) : 0
}

async function getActiveDb() {
  const session = await getSession()
  if (!session?.tenantId) throw new Error('Not authenticated')
  return getTenantDb(session.databaseName)
}

async function fetchMetaPages(accessToken: string) {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,category,access_token&access_token=${accessToken}`,
    { cache: 'no-store' }
  )
  const data = await res.json()
  return Array.isArray(data?.data) ? data.data : []
}

async function fetchMetaPosts(pageId: string, pageToken: string) {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${pageId}/posts?fields=id,message,created_time,permalink_url,full_picture,likes.summary(true),comments.summary(true)&limit=12&access_token=${pageToken}`,
    { cache: 'no-store' }
  )
  const data = await res.json()
  return Array.isArray(data?.data) ? data.data : []
}

async function fetchMetaCampaigns(accessToken: string) {
  const accountsRes = await fetch(
    `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name&access_token=${accessToken}`,
    { cache: 'no-store' }
  )
  const accountsData = await accountsRes.json()
  const accountId = accountsData?.data?.[0]?.id
  if (!accountId) return []

  const campaignsRes = await fetch(
    `https://graph.facebook.com/v19.0/${accountId}/campaigns?fields=id,name,status,objective,insights{impressions,clicks,reach,spend,ctr}&limit=10&access_token=${accessToken}`,
    { cache: 'no-store' }
  )
  const campaignsData = await campaignsRes.json()
  return Array.isArray(campaignsData?.data) ? campaignsData.data : []
}

export async function syncSocialAction() {
  try {
    const db = await getActiveDb()
    const integrations = await db.tenantIntegration.findMany({
      where: { isActive: true, deletedAt: null },
      select: { provider: true, accessToken: true, metadata: true },
    })

    if (integrations.length === 0) {
      return { success: false, error: 'No active social integrations found. Connect Meta or WhatsApp first.' }
    }

    const existingPosts = await db.socialPost.findMany({
      where: { deletedAt: null },
      select: { metadata: true },
    })

    const remoteIds = new Set<string>()
    for (const post of existingPosts) {
      const metadata = post.metadata as any
      if (typeof metadata?.remoteId === 'string') remoteIds.add(metadata.remoteId)
    }

    let importedPosts = 0
    let syncedCampaigns = 0
    let syncedPlatforms = 0

    for (const integration of integrations) {
      const metadata = (integration.metadata as any) || {}
      const accessToken = integration.accessToken || ''

      if (integration.provider === 'META_GRAPH' && accessToken) {
        syncedPlatforms++
        const pages = Array.isArray(metadata.pages) && metadata.pages.length > 0
          ? metadata.pages
          : await fetchMetaPages(accessToken)

        for (const page of pages.slice(0, 5)) {
          const pageToken = page.access_token || accessToken
          const posts = await fetchMetaPosts(page.id, pageToken)

          for (const post of posts) {
            const remoteId = `facebook:${post.id}`
            if (remoteIds.has(remoteId)) continue

            await db.socialPost.create({
              data: {
                platforms: ['facebook'],
                mediaUrl: post.full_picture || post.permalink_url || '',
                caption: post.message || `Imported historical post from ${page.name}`,
                scheduledFor: post.created_time ? new Date(post.created_time) : new Date(),
                status: 'PUBLISHED',
                metadata: {
                  imported: true,
                  provider: 'META_GRAPH',
                  remoteId,
                  pageId: page.id,
                  pageName: page.name,
                  permalinkUrl: post.permalink_url || null,
                  likes: Number(post.likes?.summary?.total_count || 0),
                  comments: Number(post.comments?.summary?.total_count || 0),
                  sourceCreatedAt: post.created_time || null,
                },
              },
            })
            remoteIds.add(remoteId)
            importedPosts++
          }
        }

        const campaigns = await fetchMetaCampaigns(accessToken)
        for (const campaign of campaigns) {
          const existingCampaign = await db.adCampaign.findFirst({
            where: { metaCampaignId: campaign.id, deletedAt: null },
            select: { publicId: true },
          })

          const metrics = {
            impressions: Number(campaign.insights?.data?.[0]?.impressions || 0),
            clicks: Number(campaign.insights?.data?.[0]?.clicks || 0),
            reach: Number(campaign.insights?.data?.[0]?.reach || 0),
            spent: Number(campaign.insights?.data?.[0]?.spend || 0),
            ctr: Number(campaign.insights?.data?.[0]?.ctr || 0),
          }

          if (existingCampaign) {
            await db.adCampaign.update({
              where: { publicId: existingCampaign.publicId },
              data: {
                status: (campaign.status || 'ACTIVE') as any,
                objective: (campaign.objective || 'ENGAGEMENT') as any,
                metrics,
              },
            })
          } else {
            await db.adCampaign.create({
              data: {
                metaCampaignId: campaign.id,
                objective: (campaign.objective || 'ENGAGEMENT') as any,
                status: (campaign.status || 'ACTIVE') as any,
                budget: Number(metrics.spent || 0),
                metrics,
              },
            })
          }

          syncedCampaigns++
        }
      }

      if (integration.provider === 'WHATSAPP_CLOUD') {
        syncedPlatforms++
      }
    }

    return {
      success: true,
      message: `Synced ${importedPosts} historical posts and ${syncedCampaigns} ad records across ${syncedPlatforms} active channels.`,
    }
  } catch (e: any) {
    console.error('[syncSocialAction]', e)
    return { success: false, error: e.message || 'Federated sync failed' }
  }
}

export async function getSocialStatsAction() {
  try {
    const db = await getActiveDb()

    const [totalPosts, pendingPosts, publishedPosts, activeIntegrations, campaignRows, messageRows] = await Promise.all([
      db.socialPost.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
      db.socialPost.count({ where: { status: 'SCHEDULED', deletedAt: null } }),
      db.socialPost.findMany({ where: { deletedAt: null }, select: { metadata: true, platforms: true } }),
      db.tenantIntegration.findMany({ where: { isActive: true, deletedAt: null }, select: { provider: true } }),
      db.adCampaign.findMany({ where: { deletedAt: null }, select: { metrics: true } }),
      db.webhookEvent.count({ where: { source: 'WHATSAPP_CLOUD', deletedAt: null } }),
    ])

    let totalEngagements = 0
    let totalReach = 0
    const platformSet = new Set<string>()

    for (const post of publishedPosts as any[]) {
      const metadata = post.metadata as any
      totalEngagements += getNumericMetric(metadata, 'likes') + getNumericMetric(metadata, 'comments')
      totalReach += getNumericMetric(metadata, 'reach')

      if (Array.isArray(post.platforms)) {
        for (const platform of post.platforms) platformSet.add(String(platform))
      }
    }

    let adSpend = 0
    let impressions = 0
    for (const campaign of campaignRows as any[]) {
      const metrics = campaign.metrics as any
      adSpend += getNumericMetric(metrics, 'spent')
      impressions += getNumericMetric(metrics, 'impressions')
    }

    for (const integration of activeIntegrations) {
      platformSet.add(String(integration.provider))
    }

    return {
      stats: {
        totalPosts,
        pendingPosts,
        totalEngagements,
        totalReach,
        totalAdSpend: adSpend,
        totalImpressions: impressions,
        whatsappMessages: messageRows,
        activePlatformsCount: platformSet.size,
      },
    }
  } catch (e: any) {
    console.error('[getSocialStatsAction]', e)
    return { stats: null, error: 'Failed to aggregate social stats' }
  }
}

export async function getSocialTimelineAction() {
  try {
    const db = await getActiveDb()
    const posts = await db.socialPost.findMany({
      where: { deletedAt: null },
      orderBy: [{ scheduledFor: 'desc' }, { createdAt: 'desc' }],
      take: 20,
    })

    return {
      posts: posts.map((post: any) => {
        const metadata = post.metadata as any
        return {
          id: post.publicId,
          caption: post.caption || '',
          mediaUrl: post.mediaUrl || '',
          status: post.status,
          platforms: Array.isArray(post.platforms) ? post.platforms : [],
          scheduledFor: post.scheduledFor?.toISOString() || null,
          createdAt: post.createdAt.toISOString(),
          engagements: getNumericMetric(metadata, 'likes') + getNumericMetric(metadata, 'comments'),
          likes: getNumericMetric(metadata, 'likes'),
          comments: getNumericMetric(metadata, 'comments'),
          permalinkUrl: metadata?.permalinkUrl || metadata?.postUrl || metadata?.facebookPostUrl || null,
          imported: !!metadata?.imported,
          pageName: metadata?.pageName || null,
        }
      }),
    }
  } catch (e: any) {
    console.error('[getSocialTimelineAction]', e)
    return { posts: [] }
  }
}
