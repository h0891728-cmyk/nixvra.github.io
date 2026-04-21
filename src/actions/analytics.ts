'use server'

import { masterDb, getTenantDb } from '@/lib/db'

export type DailyStat = {
  date: string
  revenue: number
  transactions: number
  webhooksProcessed: number
  webhooksFailed: number
}

/**
 * Aggregates analytical cross-tenant data across time buckets.
 * Designed to power Recharts for Super Admin dashboards.
 */
export async function getSuperAdminAnalytics(days: number = 30): Promise<DailyStat[]> {
  const allTenants = await masterDb.tenant.findMany({ select: { databaseName: true } })

  // Initialize day buckets
  const now = new Date()
  const statsMap = new Map<string, DailyStat>()
  
  for (let d = 0; d < days; d++) {
    const targetDate = new Date(now.getTime() - d * 24 * 60 * 60 * 1000)
    const key = targetDate.toISOString().split('T')[0] // 'YYYY-MM-DD'
    statsMap.set(key, { date: key, revenue: 0, transactions: 0, webhooksProcessed: 0, webhooksFailed: 0 })
  }

  // Define start threshold for Prisma
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

  // Aggregate concurrently across all tenant databases
  const promises = allTenants.map(async (t: any) => {
    try {
      if (t.databaseName === 'omnicore_hq') return

      const db = await getTenantDb(t.databaseName)
      
      const [transactions, webhooks] = await Promise.all([
        db.transaction.findMany({
          where: { createdAt: { gte: startDate } },
          select: { createdAt: true, amount: true, status: true }
        }),
        db.webhookEvent.findMany({
          where: { createdAt: { gte: startDate } },
          select: { createdAt: true, status: true }
        })
      ])

      // Map Transactions
      transactions.forEach(tx => {
        const key = tx.createdAt.toISOString().split('T')[0]
        const bucket = statsMap.get(key)
        if (bucket) {
          if (tx.status === 'PAID') {
            bucket.revenue += tx.amount
            bucket.transactions += 1
          }
        }
      })

      // Map Webhooks
      webhooks.forEach(wh => {
        const key = wh.createdAt.toISOString().split('T')[0]
        const bucket = statsMap.get(key)
        if (bucket) {
          if (wh.status === 'PROCESSED') bucket.webhooksProcessed += 1
          else if (wh.status === 'FAILED') bucket.webhooksFailed += 1
        }
      })
    } catch (_) {
      // Ignore tenant db failures (e.g. provision error)
    }
  })

  await Promise.all(promises)

  // Return sorted temporally (oldest to newest for charting)
  return Array.from(statsMap.values()).sort((a, b) => a.date.localeCompare(b.date))
}
