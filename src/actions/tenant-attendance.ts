'use server'

import { masterDb, getTenantDb } from '@/lib/db'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'

export async function getRecentAttendanceAction(entityPublicId: string) {
  const session = await getSession()
  if (!session || !session.tenantId) throw new Error('Unauthorized')

  const tenant = await masterDb.tenant.findUnique({ where: { id: session.tenantId } })
  if (!tenant) throw new Error('Tenant config missing')

  const db = await getTenantDb(tenant.databaseName)

  // Fetch last 60 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 60)

  return await db.attendanceLog.findMany({
    where: { 
       entityId: entityPublicId,
       date: { gte: thirtyDaysAgo }
    },
    orderBy: { date: 'desc' }
  })
}

export async function markRecordAttendanceAction(recordPublicId: string, dateString: string, status: string, notes?: string) {
  const session = await getSession()
  if (!session || !session.tenantId) throw new Error('Unauthorized')

  const tenant = await masterDb.tenant.findUnique({ where: { id: session.tenantId } })
  if (!tenant) throw new Error('Tenant config missing')

  const db = await getTenantDb(tenant.databaseName)

  const targetDate = new Date(dateString)
  targetDate.setHours(0, 0, 0, 0) // Normalize time

  const existing = await db.attendanceLog.findFirst({
    where: { entityId: recordPublicId, date: targetDate }
  })

  // Normalize valid Enum status checks
  const safeStatus = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE'].includes(status) ? status : 'ABSENT'

  if (existing) {
    if (existing.status !== safeStatus || existing.notes !== notes) {
       await db.attendanceLog.update({
         where: { id: existing.id },
         data: { status: safeStatus as any, notes: notes || null }
       })
    }
  } else {
    await db.attendanceLog.create({
      data: {
        entityId: recordPublicId,
        date: targetDate,
        status: safeStatus as any,
        notes: notes || null
      }
    })
  }

  revalidatePath(`/dashboard/modules/${recordPublicId}`)
}
