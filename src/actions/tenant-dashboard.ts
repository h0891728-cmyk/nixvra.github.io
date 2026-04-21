'use server'

import { masterDb, getTenantDb } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function getTenantOverviewStats() {
  const session = await getSession()
  if (!session || !session.tenantId) throw new Error('Unauthorized or no tenant context')

  const tenant = await masterDb.tenant.findUnique({ where: { id: session.tenantId } })
  if (!tenant) throw new Error('Tenant not found')

  const db = await getTenantDb(tenant.databaseName)

  const [recordCount, txCount, webhookCount, totalGross] = await Promise.all([
    db.businessEntity.count({ where: { deletedAt: null } }),
    db.transaction.count({ where: { deletedAt: null } }),
    db.webhookEvent.count({ where: { deletedAt: null } }),
    db.transaction.aggregate({
      _sum: { amount: true },
      where: { status: 'PAID', deletedAt: null }
    })
  ])

  return {
    records: recordCount,
    transactions: txCount,
    webhooks: webhookCount,
    revenue: totalGross._sum.amount || 0
  }
}
