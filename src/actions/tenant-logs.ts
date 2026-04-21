'use server'

import { masterDb, getTenantDb } from '@/lib/db'
import { getSession } from '@/lib/session'

/**
 * Grabs unified logs localized strictly to the signed-in tenant's isolated database.
 */
export async function getTenantActivityLogs(limit: number = 100) {
  const session = await getSession()
  if (!session || !session.tenantId) throw new Error('Unauthorized or no tenant context')

  const tenant = await masterDb.tenant.findUnique({ where: { id: session.tenantId } })
  if (!tenant) throw new Error('Tenant not found')

  const db = await getTenantDb(tenant.databaseName)

  // We can fetch AuditLog, Webhooks, and Social Posts, then merge them.
  const [audits, webhooks, transactions] = await Promise.all([
    db.auditLog.findMany({ take: limit, orderBy: { createdAt: 'desc' }}),
    db.webhookEvent.findMany({ take: limit, orderBy: { createdAt: 'desc' }}),
    db.transaction.findMany({ take: limit, orderBy: { createdAt: 'desc' }})
  ])

  // Normalize into a single unified Activity Stream
  const feed: any[] = []

  audits.forEach((a: any) => feed.push({
    id: `audit-${a.publicId}`, type: 'AUDIT', action: a.action,
    details: a.details, timestamp: a.createdAt, status: 'INFO'
  }))

  webhooks.forEach((w: any) => feed.push({
    id: `webhook-${w.publicId}`, type: 'WEBHOOK', action: `Incoming ${w.source} Event`,
    details: w.payload, timestamp: w.createdAt, status: w.status
  }))

  transactions.forEach((t: any) => feed.push({
    id: `tx-${t.publicId}`, type: 'FINANCE', action: `Payment via ${t.paymentGateway}`,
    details: { amount: t.amount, entityId: t.entityId }, timestamp: t.createdAt, status: t.status
  }))

  return feed.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit)
}
