'use server'

import { getTenantDb } from '@/lib/db'
import { getSession } from '@/lib/session'

const HQ_TENANT_DB = 'omnicore_hq'

export async function getTasks() {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') throw new Error('Unauthorized')

  const db = await getTenantDb(HQ_TENANT_DB)
  const tasks = await db.task.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' }
  })

  return tasks.map((t: any) => ({ ...t, id: String(t.id) }))
}

export async function createTask(payload: { title: string, priority: string }) {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') throw new Error('Unauthorized')

  const db = await getTenantDb(HQ_TENANT_DB)
  const task = await db.task.create({
    data: {
      title: payload.title,
      priority: payload.priority as any,
      creatorId: session.userId,
    }
  })

  // Create audit log
  await db.auditLog.create({
    data: {
      userId: session.userId,
      action: 'CREATED_TASK',
      entityType: 'TASK',
      entityId: task.publicId,
      details: { title: task.title }
    }
  })

  return { success: true }
}

export async function updateTaskStatus(publicId: string, status: string) {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') throw new Error('Unauthorized')

  const db = await getTenantDb(HQ_TENANT_DB)
  await db.task.update({
    where: { publicId },
    data: { status: status as any }
  })
}

export async function deleteTask(publicId: string) {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') throw new Error('Unauthorized')

  const db = await getTenantDb(HQ_TENANT_DB)
  await db.task.update({
    where: { publicId },
    data: { deletedAt: new Date() }
  })
}
