'use server'

import { masterDb, getTenantDb } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function getGlobalAuditLogs(limit: number = 100) {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') throw new Error('Unauthorized')

  const tenants = await masterDb.tenant.findMany({
    select: { id: true, name: true, subdomain: true, databaseName: true }
  })

  const results: any[] = []

  const promises = tenants.map(async (t) => {
    try {
      const db = await getTenantDb(t.databaseName)
      const logs = await db.auditLog.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' }
      })

      logs.forEach((log: any) => {
        results.push({
          ...log,
          id: String(log.id),
          tenant: { id: t.id, name: t.name, subdomain: t.subdomain }
        })
      })
    } catch (_) {
      // Ignore tenant databases failing to connect or lacking table
    }
  })

  await Promise.all(promises)
  
  return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit)
}
