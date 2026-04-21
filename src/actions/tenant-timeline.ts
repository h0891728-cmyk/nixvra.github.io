'use server'

import { masterDb, getTenantDb } from '@/lib/db'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'

export async function getRecordTimelineAction(recordPublicId: string) {
  const session = await getSession()
  if (!session || !session.tenantId) throw new Error('Unauthorized')

  const tenant = await masterDb.tenant.findUnique({ where: { id: session.tenantId } })
  if (!tenant) throw new Error('Tenant config missing')

  const db = await getTenantDb(tenant.databaseName)
  
  return await db.timelineEvent.findMany({
    where: { entityId: recordPublicId },
    orderBy: { createdAt: 'desc' },
    take: 50 // Pull newest 50 events maximum
  })
}

export async function createTimelineEventAction(entityPublicId: string, data: { title: string, description?: string, fileUrl?: string, fileMeta?: string }) {
  const session = await getSession()
  if (!session || !session.tenantId) throw new Error('Unauthorized')

  const tenant = await masterDb.tenant.findUnique({ where: { id: session.tenantId } })
  if (!tenant) throw new Error('Tenant missing')

  const db = await getTenantDb(tenant.databaseName)
  
  await db.timelineEvent.create({
     data: {
       entityId: entityPublicId,
       title: data.title.trim(),
       description: data.description?.trim() || null,
       fileUrl: data.fileUrl || null,
       fileMeta: data.fileMeta || null
     }
  })

  revalidatePath(`/dashboard/modules/${entityPublicId}`)
}
