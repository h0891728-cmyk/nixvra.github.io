'use server'

import { masterDb, getTenantDb } from '@/lib/db'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'

export async function getTenantSchemaAction(tenantId: string) {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') throw new Error('Unauthorized')

  const tenant = await masterDb.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) throw new Error('Tenant missing')

  const db = await getTenantDb(tenant.databaseName)
  
  return await db.customField.findMany({ orderBy: { name: 'asc' } })
}

export async function createTenantSchemaFieldAction(tenantId: string, data: { name: string, entityType: string, fieldType: string, isRequired: boolean, options?: string[] }) {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') throw new Error('Unauthorized')

  const tenant = await masterDb.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) throw new Error('Tenant missing')

  const db = await getTenantDb(tenant.databaseName)
  
  await db.customField.create({
     data: {
       name: data.name.trim(),
       entityType: data.entityType as any,
       fieldType: data.fieldType as any,
       isRequired: data.isRequired,
       options: data.options && data.options.length > 0 ? JSON.stringify(data.options) : undefined
     }
  })

  revalidatePath(`/super-admin/tenants/${tenantId}`)
}
