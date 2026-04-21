'use server'

import { getTenantDb } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function deleteGlobalEntityAction(tenantDbName: string, idStr: string) {
  const db = await getTenantDb(tenantDbName)
  await db.businessEntity.delete({ where: { id: BigInt(idStr) } })
  revalidatePath('/super-admin/entities')
}
