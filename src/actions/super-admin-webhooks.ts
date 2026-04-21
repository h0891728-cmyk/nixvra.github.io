'use server'

import { masterDb, getTenantDb } from '@/lib/db'

export async function getGlobalWebhookEvents() {
  const tenants = await masterDb.tenant.findMany({
    select: { id: true, name: true, subdomain: true, databaseName: true }
  })

  const results: any[] = []

  const promises = tenants.map(async (t) => {
    try {
      const db = await getTenantDb(t.databaseName)
      const events = await db.webhookEvent.findMany({
        where: { deletedAt: null },
        take: 100,
        orderBy: { createdAt: 'desc' }
      })
      events.forEach((e: any) => {
        results.push({
          ...e,
          id: String(e.id),
          tenant: { id: t.id, name: t.name, subdomain: t.subdomain }
        })
      })
    } catch (_) {
      // Ignore failing DBs
    }
  })

  await Promise.all(promises)
  
  // Sort latest first globally
  return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}
