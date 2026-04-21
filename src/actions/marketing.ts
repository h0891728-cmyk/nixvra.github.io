'use server'

import { masterDb, getTenantDb } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/session'

/* ─── Helpers ───────────────────────────────────────────────── */
async function getDbForTenant(tenantId: string) {
  const session = await getSession()
  if (!session?.tenantId) throw new Error('Unauthorized')
  if (session.role !== 'SUPER_ADMIN' && session.tenantId !== tenantId) {
    throw new Error('Forbidden')
  }

  const tenant = await masterDb.tenant.findUnique({
    where: { id: tenantId },
    select: { databaseName: true },
  })
  if (!tenant) throw new Error('Tenant not found')
  return getTenantDb(tenant.databaseName)
}

async function getIntegration(tenantId: string, provider: string) {
  const db = await getDbForTenant(tenantId)
  return db.tenantIntegration.findUnique({
    where: { provider: provider as any },
  })
}

/* ═══════════════════════════════════════════════════════════════
   INTEGRATION STATUS (for UI)
   ═══════════════════════════════════════════════════════════════ */

export async function getIntegrationStatus(tenantId: string) {
  const db = await getDbForTenant(tenantId)
  const integrations = await db.tenantIntegration.findMany({
    where: { isActive: true, deletedAt: null },
    select: { provider: true, metadata: true, isActive: true, createdAt: true },
  })

  const result: Record<string, { connected: boolean; metadata: any; connectedAt: string | null }> = {}
  for (const i of integrations) {
    result[i.provider] = {
      connected: i.isActive,
      metadata: i.metadata,
      connectedAt: i.createdAt ? i.createdAt.toISOString() : null,
    }
  }
  return result
}

/* ═══════════════════════════════════════════════════════════════
   SOCIAL POSTS
   ═══════════════════════════════════════════════════════════════ */

export async function getSocialPosts(tenantId: string) {
  const db = await getDbForTenant(tenantId)
  return db.socialPost.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
}

export async function createSocialPost(
  tenantId: string,
  data: {
    platforms: string[]
    caption: string
    mediaUrl?: string
    scheduledFor?: string
    metadata?: any
  }
) {
  const db = await getDbForTenant(tenantId)
  const post = await db.socialPost.create({
    data: {
      platforms: data.platforms,
      caption: data.caption,
      mediaUrl: data.mediaUrl || '',
      scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
      status: data.scheduledFor ? 'SCHEDULED' : 'DRAFT',
      metadata: data.metadata || {},
    },
  })
  revalidatePath(`/super-admin/tenants/${tenantId}`)
  return { success: true, post }
}

export async function publishSocialPost(tenantId: string, publicId: string) {
  const db = await getDbForTenant(tenantId)
  const existing = await db.socialPost.findUnique({ where: { publicId } })
  if (!existing) throw new Error('Post not found')

  const integration = await getIntegration(tenantId, 'META_GRAPH')
  const meta = (integration?.metadata as any) || {}
  const pages: any[] = meta.pages || []

  let newMeta: any = { ...(existing.metadata as any || {}) }
  let newStatus: string = 'PUBLISHED'
  const platforms = Array.isArray(existing.platforms) ? existing.platforms : []

  // If we have a real token + a matching page—try real API
  if (integration?.accessToken && pages.length > 0) {
    const pageId = newMeta.pageId || pages[0]?.id
    const page = pages.find((p: any) => p.id === pageId) || pages[0]
    const pageToken = page?.accessToken || integration.accessToken

    try {
      if (platforms.includes('instagram')) {
        // Instagram Graph API: Create container then publish
        // Step 1: create media container
        const igRes = await fetch(
          `https://graph.facebook.com/v19.0/${page.id}/ig_users`,
          { cache: 'no-store' }
        )
        const igUser = await igRes.json()
        const igUserId = igUser.data?.[0]?.id

        if (igUserId) {
          const containerRes = await fetch(
            `https://graph.facebook.com/v19.0/${igUserId}/media`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                caption: existing.caption,
                image_url: existing.mediaUrl || undefined,
                access_token: pageToken,
              }),
              cache: 'no-store',
            }
          )
          const containerData = await containerRes.json()

          if (containerData.id) {
            // Step 2: publish container
            const publishRes = await fetch(
              `https://graph.facebook.com/v19.0/${igUserId}/media_publish`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  creation_id: containerData.id,
                  access_token: pageToken,
                }),
                cache: 'no-store',
              }
            )
            const publishData = await publishRes.json()
            if (publishData.id) {
              newMeta.instagramPostId = publishData.id
              newMeta.postUrl = `https://www.instagram.com/p/${publishData.id}/`
            }
          }
        }
      }

      if (platforms.includes('facebook')) {
        const fbRes = await fetch(
          `https://graph.facebook.com/v19.0/${page.id}/feed`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: existing.caption,
              link: existing.mediaUrl || undefined,
              access_token: pageToken,
            }),
            cache: 'no-store',
          }
        )
        const fbData = await fbRes.json()
        if (fbData.id) {
          const [fbPageId, fbPostId] = fbData.id.split('_')
          newMeta.facebookPostId = fbData.id
          newMeta.facebookPostUrl = `https://www.facebook.com/${fbPageId}/posts/${fbPostId}`
          if (!newMeta.postUrl) newMeta.postUrl = newMeta.facebookPostUrl
        } else if (fbData.error) {
          throw new Error(`Facebook publish error: ${fbData.error.message}`)
        }
      }

      newMeta.publishedAt = new Date().toISOString()
      newMeta.publishedVia = 'meta_graph_api'
    } catch (err: any) {
      newStatus = 'FAILED'
      newMeta.error = err.message || 'Unknown publish error'
      newMeta.failedAt = new Date().toISOString()
    }
  } else {
    // No real token — mark as published with mock info
    newMeta.publishedAt = new Date().toISOString()
    newMeta.publishedVia = 'simulated'
    newMeta.postUrl = `https://www.facebook.com/permalink/simulated/${Math.random().toString(36).substring(2, 10)}`
    newMeta.note = 'Simulated publish — connect Meta integration for real posting'
  }

  await db.socialPost.update({
    where: { publicId },
    data: { status: newStatus as any, metadata: newMeta },
  })

  revalidatePath(`/super-admin/tenants/${tenantId}`)
  return { success: newStatus === 'PUBLISHED', status: newStatus, meta: newMeta }
}

export async function deleteSocialPost(tenantId: string, publicId: string) {
  const db = await getDbForTenant(tenantId)
  await db.socialPost.update({
    where: { publicId },
    data: { deletedAt: new Date() },
  })
  revalidatePath(`/super-admin/tenants/${tenantId}`)
  return { success: true }
}

export async function getConnectedMetaPages(tenantId: string) {
  const integration = await getIntegration(tenantId, 'META_GRAPH')
  if (!integration || !integration.isActive) return []

  const meta = (integration.metadata as any) || {}
  const pages: any[] = meta.pages || []

  // If pages were stored during OAuth — return them
  if (pages.length > 0) {
    return pages.map((p: any) => ({ id: p.id, name: p.name, category: p.category }))
  }

  // Fallback: if legacy metadata stored accountName only
  if (meta.accountName) {
    return [{ id: meta.accountId || 'default', name: meta.accountName }]
  }

  return []
}

/* ═══════════════════════════════════════════════════════════════
   AD CAMPAIGNS
   ═══════════════════════════════════════════════════════════════ */

export async function getAdCampaigns(tenantId: string) {
  const db = await getDbForTenant(tenantId)
  return db.adCampaign.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
}

export async function createAdCampaign(
  tenantId: string,
  data: {
    objective: string
    budget: number
    name?: string
    dailyBudget?: number
    startTime?: string
    endTime?: string
  }
) {
  const db = await getDbForTenant(tenantId)
  const integration = await getIntegration(tenantId, 'META_GRAPH')
  const meta = (integration?.metadata as any) || {}

  let metaCampaignId: string | null = null

  // Try creating real Meta campaign if token exists
  if (integration?.accessToken && meta.whatsappBusinessAccountId) {
    try {
      const adAccountRes = await fetch(
        `https://graph.facebook.com/v19.0/me/adaccounts?access_token=${integration.accessToken}`,
        { cache: 'no-store' }
      )
      const adAccountData = await adAccountRes.json()
      const adAccountId = adAccountData.data?.[0]?.id

      if (adAccountId) {
        const campaignRes = await fetch(
          `https://graph.facebook.com/v19.0/${adAccountId}/campaigns`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: data.name || `Nixvra ${data.objective} Campaign`,
              objective: data.objective,
              status: 'PAUSED', // Start paused for safety
              special_ad_categories: [],
              access_token: integration.accessToken,
            }),
            cache: 'no-store',
          }
        )
        const campaignData = await campaignRes.json()
        if (campaignData.id) {
          metaCampaignId = campaignData.id
        }
      }
    } catch (_) {
      // Fall through — create locally
    }
  }

  const campaign = await db.adCampaign.create({
    data: {
      objective: data.objective as any,
      budget: data.budget,
      status: 'ACTIVE',
      metaCampaignId,
      metrics: {
        impressions: 0, clicks: 0, leads: 0, spent: 0,
        ctr: 0, cpl: 0, reach: 0,
      },
    },
  })
  revalidatePath(`/super-admin/tenants/${tenantId}`)
  return { success: true, campaign, isReal: !!metaCampaignId }
}

export async function toggleAdCampaign(tenantId: string, publicId: string) {
  const db = await getDbForTenant(tenantId)
  const current = await db.adCampaign.findFirst({
    where: { publicId, deletedAt: null },
  })
  if (!current) throw new Error('Campaign not found')

  const newStatus = current.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'

  // Sync to Meta Ads API if we have a real campaign ID
  if (current.metaCampaignId) {
    const integration = await getIntegration(tenantId, 'META_GRAPH')
    if (integration?.accessToken) {
      try {
        await fetch(
          `https://graph.facebook.com/v19.0/${current.metaCampaignId}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: newStatus,
              access_token: integration.accessToken,
            }),
            cache: 'no-store',
          }
        )
      } catch (_) { /* silent fail */ }
    }
  }

  await db.adCampaign.update({
    where: { publicId },
    data: { status: newStatus as any },
  })
  revalidatePath(`/super-admin/tenants/${tenantId}`)
  return { success: true }
}

export async function deleteAdCampaign(tenantId: string, publicId: string) {
  const db = await getDbForTenant(tenantId)
  await db.adCampaign.update({
    where: { publicId },
    data: { deletedAt: new Date() },
  })
  revalidatePath(`/super-admin/tenants/${tenantId}`)
  return { success: true }
}

/* ═══════════════════════════════════════════════════════════════
   WHATSAPP MESSAGES
   ═══════════════════════════════════════════════════════════════ */

export async function getWhatsAppMessages(tenantId: string) {
  const db = await getDbForTenant(tenantId)
  return db.webhookEvent.findMany({
    where: { source: 'WHATSAPP_CLOUD', deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
}

export async function getWhatsAppStatus(tenantId: string) {
  const integration = await getIntegration(tenantId, 'WHATSAPP_CLOUD')

  const envToken  = process.env.WHATSAPP_ACCESS_TOKEN || ''
  const envPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || ''
  const envWabaId  = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || ''

  if (!integration?.isActive && !envToken) return { connected: false }

  const meta: any = (integration?.metadata as any) || {}
  return {
    connected: true,
    phoneNumberId:     meta.whatsappPhoneNumberId || envPhoneId,
    businessAccountId: meta.whatsappBusinessAccountId || envWabaId,
    accountName:       meta.accountName || 'WhatsApp Business',
    usingEnvFallback:  !integration?.isActive && !!envToken,
  }
}

async function sendWhatsAppViaAPI(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const toClean = to.replace(/\D/g, '')

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toClean,
        type: 'text',
        text: { preview_url: false, body: text },
      }),
      cache: 'no-store',
    }
  )

  const data = await res.json()
  if (data.error) {
    return { success: false, error: data.error.message }
  }
  return { success: true, messageId: data.messages?.[0]?.id }
}

async function sendWhatsAppTemplate(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  templateName: string,
  languageCode = 'en_US'
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const toClean = to.replace(/\D/g, '')

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toClean,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
        },
      }),
      cache: 'no-store',
    }
  )

  const data = await res.json()
  if (data.error) {
    return { success: false, error: data.error.message }
  }
  return { success: true, messageId: data.messages?.[0]?.id }
}

export async function sendWhatsAppMessage(
  tenantId: string,
  data: { to: string; message: string }
) {
  const db = await getDbForTenant(tenantId)
  const integration = await getIntegration(tenantId, 'WHATSAPP_CLOUD')
  const meta = (integration?.metadata as any) || {}

  // Resolve token/phoneId from integration or env fallback
  const accessToken  = integration?.accessToken  || process.env.WHATSAPP_ACCESS_TOKEN  || ''
  const phoneNumberId = meta.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || ''

  let apiResult: { success: boolean; messageId?: string; error?: string } = {
    success: false, error: 'WhatsApp not connected — add WHATSAPP_ACCESS_TOKEN to .env.local or connect via OAuth'
  }

  if (accessToken && phoneNumberId) {
    apiResult = await sendWhatsAppViaAPI(phoneNumberId, accessToken, data.to, data.message)
  }

  // Always log to DB
  const record = await db.webhookEvent.create({
    data: {
      source: 'WHATSAPP_CLOUD',
      status: apiResult.success ? 'PROCESSED' : 'FAILED',
      payload: {
        type: 'outgoing_message',
        to: data.to,
        message: data.message,
        messageId: apiResult.messageId || null,
        error: apiResult.error || null,
        sentAt: new Date().toISOString(),
        via: (accessToken && phoneNumberId) ? 'whatsapp_cloud_api' : 'simulated',
      },
    },
  })

  revalidatePath(`/super-admin/tenants/${tenantId}`)
  return { success: apiResult.success, apiResult, record }
}

export async function sendWhatsAppBroadcast(
  tenantId: string,
  data: {
    templateName: string
    recipients: string[]
    message: string
    useTemplate?: boolean
  }
) {
  const db = await getDbForTenant(tenantId)
  const integration = await getIntegration(tenantId, 'WHATSAPP_CLOUD')
  const meta = (integration?.metadata as any) || {}

  const hasRealApi = !!(integration?.accessToken && meta.whatsappPhoneNumberId)
  const results: { to: string; success: boolean; messageId?: string; error?: string }[] = []

  for (const recipient of data.recipients) {
    let result: { success: boolean; messageId?: string; error?: string }

    if (hasRealApi) {
      if (data.useTemplate && data.templateName) {
        result = await sendWhatsAppTemplate(
          meta.whatsappPhoneNumberId,
          integration!.accessToken!,
          recipient,
          data.templateName
        )
      } else {
        result = await sendWhatsAppViaAPI(
          meta.whatsappPhoneNumberId,
          integration!.accessToken!,
          recipient,
          data.message
        )
      }
    } else {
      result = { success: false, error: 'WhatsApp Cloud API not configured' }
    }

    results.push({ to: recipient, ...result })
  }

  const successCount = results.filter(r => r.success).length
  const failureCount = results.length - successCount

  // Log broadcast to DB
  await db.webhookEvent.create({
    data: {
      source: 'WHATSAPP_CLOUD',
      status: successCount > 0 ? 'PROCESSED' : 'FAILED',
      payload: {
        type: 'broadcast',
        templateName: data.templateName,
        recipients: data.recipients,
        message: data.message,
        sentAt: new Date().toISOString(),
        recipientCount: data.recipients.length,
        successCount,
        failureCount,
        results,
        via: hasRealApi ? 'whatsapp_cloud_api' : 'simulated',
      },
    },
  })

  revalidatePath(`/super-admin/tenants/${tenantId}`)
  return { success: successCount > 0, successCount, failureCount, results }
}

export async function getWhatsAppTemplates(tenantId: string) {
  const integration = await getIntegration(tenantId, 'WHATSAPP_CLOUD')
  const meta = (integration?.metadata as any) || {}

  if (!integration?.accessToken || !meta.whatsappBusinessAccountId) {
    // Return common demo templates
    return [
      { name: 'hello_world', status: 'APPROVED', category: 'UTILITY', language: 'en_US' },
      { name: 'appointment_reminder', status: 'APPROVED', category: 'UTILITY', language: 'en_IN' },
      { name: 'order_confirmation', status: 'APPROVED', category: 'TRANSACTIONAL', language: 'en_US' },
    ]
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${meta.whatsappBusinessAccountId}/message_templates?access_token=${integration.accessToken}`,
      { cache: 'no-store' }
    )
    const data = await res.json()
    if (data.error) return []
    return (data.data || []).map((t: any) => ({
      name: t.name,
      status: t.status,
      category: t.category,
      language: t.language,
    }))
  } catch {
    return []
  }
}
