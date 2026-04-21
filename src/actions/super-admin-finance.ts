'use server'

import { masterDb, getTenantDb } from '@/lib/db'

export async function getGlobalTransactions(limit: number = 100) {
  const tenants = await masterDb.tenant.findMany({
    select: { id: true, name: true, subdomain: true, databaseName: true }
  })

  const results: any[] = []

  const promises = tenants.map(async (t) => {
    try {
      const db = await getTenantDb(t.databaseName)
      const txs = await db.transaction.findMany({
        where: { deletedAt: null },
        take: limit,
        orderBy: { createdAt: 'desc' },
      })
      
      txs.forEach((tx: any) => {
        results.push({
          ...tx,
          id: String(tx.id),
          tenant: { id: t.id, name: t.name, subdomain: t.subdomain }
        })
      })
    } catch (_) {
      // Ignore failing DBs (e.g. migrations missing)
    }
  })

  await Promise.all(promises)
  return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit)
}

export type FinancialDailyStat = {
  date: string
  grossVolume: number
  successCount: number
  failedCount: number
}

export async function getGlobalFinancialAnalytics(days: number = 30): Promise<FinancialDailyStat[]> {
  const tenants = await masterDb.tenant.findMany({
    select: { id: true, databaseName: true }
  })
  
  const now = new Date()
  const statsMap = new Map<string, FinancialDailyStat>()

  for (let d = 0; d < days; d++) {
    const targetDate = new Date(now.getTime() - d * 24 * 60 * 60 * 1000)
    const key = targetDate.toISOString().split('T')[0]
    statsMap.set(key, { date: key, grossVolume: 0, successCount: 0, failedCount: 0 })
  }

  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

  const promises = tenants.map(async (t) => {
    try {
      const db = await getTenantDb(t.databaseName)
      const txs = await db.transaction.findMany({
        where: { createdAt: { gte: startDate }, deletedAt: null },
        select: { createdAt: true, amount: true, status: true }
      })

      txs.forEach((tx: any) => {
        const key = tx.createdAt.toISOString().split('T')[0]
        const bucket = statsMap.get(key)
        if (bucket) {
          if (tx.status === 'PAID') {
            bucket.grossVolume += Number(tx.amount) || 0
            bucket.successCount += 1
          } else if (tx.status === 'FAILED') {
            bucket.failedCount += 1
          }
        }
      })
    } catch (_) {}
  })

  await Promise.all(promises)
  return Array.from(statsMap.values()).sort((a, b) => a.date.localeCompare(b.date))
}
