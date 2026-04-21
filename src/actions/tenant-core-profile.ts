'use server'

import { masterDb, getTenantDb } from '@/lib/db'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'

export async function updateRecordCoreAction(recordPublicId: string, data: { name: string, contact: string, description: string, coreTrait: string, coreValue: string }) {
  const session = await getSession()
  if (!session || !session.tenantId) throw new Error('Unauthorized')

  const tenant = await masterDb.tenant.findUnique({ where: { id: session.tenantId } })
  if (!tenant) throw new Error('Tenant config missing')

  const db = await getTenantDb(tenant.databaseName)

  let finalValue: any = null
  if (data.coreValue && !isNaN(Number(data.coreValue))) {
      finalValue = Number(data.coreValue)
  }

  await db.businessEntity.update({
    where: { publicId: recordPublicId },
    data: {
      name: data.name,
      contact: data.contact || null,
      description: data.description || null,
      coreTrait: data.coreTrait || null,
      coreValue: finalValue
    }
  })

  revalidatePath(`/dashboard/modules/${recordPublicId}`)
}
