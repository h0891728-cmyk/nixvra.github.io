'use server'

import { masterDb, getTenantDb } from '@/lib/db'

export async function provisionTenantAdAccount(tenantDb: string, payload: { adAccountId: string, businessManagerId?: string, pixelId?: string }) {
  const db = await getTenantDb(tenantDb)
  
  // Find existing META_GRAPH
  const existing = await db.tenantIntegration.findFirst({
    where: { provider: 'META_GRAPH' }
  })

  // We merge this into metadata
  const newMeta = {
    ...(existing?.metadata ? (existing.metadata as any) : {}),
    adAccountId: payload.adAccountId,
    businessManagerId: payload.businessManagerId || null,
    pixelId: payload.pixelId || null,
    _provisionedByNetworkStatus: 'SUPER_ADMIN_MANUAL'
  }

  if (existing) {
    await db.tenantIntegration.update({
      where: { id: existing.id },
      data: { metadata: newMeta, isActive: true }
    })
  } else {
    await db.tenantIntegration.create({
      data: {
        provider: 'META_GRAPH',
        apiKey: '',
        accessToken: '',
        refreshToken: '',
        webhookUrl: '',
        isActive: true,
        metadata: newMeta
      }
    })
  }

  return { success: true }
}

export async function crossTenantCreateAdCampaign(tenantDb: string, payload: { objective: string, budget: number, durationDays?: number, targetAudience?: any, creatives?: any[] }) {
  const db = await getTenantDb(tenantDb)

  // Validate the ad account exists somehow
  const metaInt = await db.tenantIntegration.findFirst({ where: { provider: 'META_GRAPH' } })
  const meta: any = metaInt?.metadata || {}
  
  if (!meta.adAccountId && !metaInt?.accessToken) {
     return { success: false, error: 'Tenant has no Meta Ad Account provisioned. Provision through Admin Panel first.' }
  }

  // Create campaign logically in database
  const campaign = await db.adCampaign.create({
    data: {
      objective: payload.objective as any,
      budget: payload.budget,
      status: 'ACTIVE',
      metrics: {
        impressions: 0,
        clicks: 0,
        leads: 0,
        spent: 0,
        ...payload.targetAudience, // Quick cheat to store targeting intent 
      }
    }
  })

  // We simulate "pushing it to meta API" if this isn't connected to a real live token
  // Normally here we would perform the Axios call to graph.facebook.com using meta.adAccountId

  return { success: true, campaignId: String(campaign.id) }
}
