'use server'

import { getTenantDb } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function upsertGlobalIntegrationAction(tenantDbName: string, formData: FormData) {
  const provider = formData.get('provider') as any
  const apiKey = formData.get('apiKey') as string || null
  const accessToken = formData.get('accessToken') as string || null
  const refreshToken = formData.get('refreshToken') as string || null
  const webhookUrl = formData.get('webhookUrl') as string || null
  const metadataStr = formData.get('metadata') as string
  
  let metadata = null
  if (metadataStr) {
    try {
      metadata = JSON.parse(metadataStr)
    } catch (_) {}
  }

  // Preserve existing secret if input is obfuscated
  const db = await getTenantDb(tenantDbName)
  const existing = await db.tenantIntegration.findUnique({ where: { provider } })

  const finalApiKey = apiKey?.includes('****') ? existing?.apiKey : apiKey
  const finalAccessToken = accessToken?.includes('****') ? existing?.accessToken : accessToken
  const finalRefreshToken = refreshToken?.includes('****') ? existing?.refreshToken : refreshToken

  await db.tenantIntegration.upsert({
    where: { provider },
    update: {
      apiKey: finalApiKey,
      accessToken: finalAccessToken,
      refreshToken: finalRefreshToken,
      webhookUrl,
      metadata: metadata ?? existing?.metadata ?? null,
      isActive: true,
    },
    create: {
      provider,
      apiKey: finalApiKey,
      accessToken: finalAccessToken,
      refreshToken: finalRefreshToken,
      webhookUrl,
      metadata,
      isActive: true,
    }
  })

  revalidatePath('/super-admin/integrations')
}

export async function toggleGlobalIntegrationAction(tenantDbName: string, provider: string, isActive: boolean) {
  const db = await getTenantDb(tenantDbName)
  await db.tenantIntegration.update({
    where: { provider: provider as any },
    data: { isActive }
  })
  revalidatePath('/super-admin/integrations')
}

export async function deleteGlobalIntegrationAction(tenantDbName: string, provider: string) {
  const db = await getTenantDb(tenantDbName)
  await db.tenantIntegration.delete({
    where: { provider: provider as any }
  })
  revalidatePath('/super-admin/integrations')
}
