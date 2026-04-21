'use server'

import { getTenantDb } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function deleteGlobalUserAction(tenantDbName: string, idStr: string) {
  const db = await getTenantDb(tenantDbName)
  await db.user.delete({ where: { id: BigInt(idStr) } })
  revalidatePath('/super-admin/users')
}

export async function updateGlobalUserRoleAction(tenantDbName: string, idStr: string, newRole: string) {
  const db = await getTenantDb(tenantDbName)
  await db.user.update({
    where: { id: BigInt(idStr) },
    data: { role: newRole as any }
  })
  revalidatePath('/super-admin/users')
}
