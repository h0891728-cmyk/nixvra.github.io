'use server'

import { masterDb, getTenantDb } from '@/lib/db'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'

// ── GET CORE ENTITY PROFILE ───────────────────────────────────────────────────
export async function getRecordProfileAction(recordPublicId: string) {
  const session = await getSession()
  if (!session || !session.tenantId) throw new Error('Unauthorized')

  const tenant = await masterDb.tenant.findUnique({ where: { id: session.tenantId } })
  if (!tenant) throw new Error('Tenant config missing')

  const db = await getTenantDb(tenant.databaseName)
  
  const record = await db.businessEntity.findUnique({
    where: { publicId: recordPublicId }
  })
  
  if (!record) return null

  // Fetch optional mapped portal user logic
  let userAuth = null
  if (record.userId) {
     userAuth = await db.user.findUnique({
       where: { publicId: record.userId },
       select: { publicId: true, email: true, role: true }
     })
  }

  return { 
    ...record, 
    id: record.id.toString(),
    coreValue: record.coreValue ? Number(record.coreValue) : null,
    currency: tenant.currency ?? 'INR',
    userAuth 
  }
}

// ── GET DYNAMIC FIELDS & VALUES ───────────────────────────────────────────────
export async function getCustomFieldsAndValuesAction(entityPublicId: string, entityType: string) {
  const session = await getSession()
  if (!session || !session.tenantId) throw new Error('Unauthorized')

  const tenant = await masterDb.tenant.findUnique({ where: { id: session.tenantId } })
  if (!tenant) throw new Error('Tenant config missing')

  const db = await getTenantDb(tenant.databaseName)

  // 1. Fetch schema definitions for THIS specific industry type (e.g. all PROPERTY fields)
  const fields = await db.customField.findMany({
    where: { entityType: entityType as any, deletedAt: null },
    orderBy: { createdAt: 'asc' }
  })

  // 2. Fetch any actual string values input for this specific profile ID
  const values = await db.customFieldValue.findMany({
    where: { entityId: entityPublicId, deletedAt: null }
  })

  // Map values onto the fields for frontend parsing
  return fields.map(f => {
     const match = values.find(v => v.customFieldId === f.publicId)
     return {
       fieldSchema: f,
       fieldValue: match ? match.value : null
     }
  })
}

// ── CREATE NEW SCHEMA FIELD ───────────────────────────────────────────────────
export async function createCustomFieldAction(type: string, name: string, fieldType: string) {
  const session = await getSession()
  if (!session || !session.tenantId) throw new Error('Unauthorized')

  const tenant = await masterDb.tenant.findUnique({ where: { id: session.tenantId } })
  if (!tenant) throw new Error('Tenant config missing')

  const db = await getTenantDb(tenant.databaseName)

  await db.customField.create({
    data: {
      entityType: type as any,
      name: name.trim(),
      fieldType: fieldType as any
    }
  })
  // Let the client handle revalidation optionally
}

// ── SAVE/UPDATE DYNAMIC FORM VALUES ───────────────────────────────────────────
export async function saveCustomValuesAction(entityPublicId: string, entries: { fieldId: string, value: string }[]) {
  const session = await getSession()
  if (!session || !session.tenantId) throw new Error('Unauthorized')

  const tenant = await masterDb.tenant.findUnique({ where: { id: session.tenantId } })
  if (!tenant) throw new Error('Tenant config missing')

  const db = await getTenantDb(tenant.databaseName)

  // Sequential upsert logically mapped via composite manual check
  for (const entry of entries) {
     const existing = await db.customFieldValue.findFirst({
        where: { entityId: entityPublicId, customFieldId: entry.fieldId }
     })

     if (existing) {
        await db.customFieldValue.update({
          where: { id: existing.id },
          data: { value: entry.value, updatedAt: new Date() }
        })
     } else {
        await db.customFieldValue.create({
          data: {
             entityId: entityPublicId,
             customFieldId: entry.fieldId,
             value: entry.value
          }
        })
     }
  }

  revalidatePath(`/dashboard/modules/${entityPublicId}`)
}
