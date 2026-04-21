'use server'

import { masterDb, getTenantDb } from '@/lib/db'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'

// FETCH ALL ASSOCIATIONS (Upstream & Downstream)
export async function getRecordRelationsAction(recordPublicId: string) {
  const session = await getSession()
  if (!session || !session.tenantId) throw new Error('Unauthorized')

  const tenant = await masterDb.tenant.findUnique({ where: { id: session.tenantId } })
  if (!tenant) throw new Error('Tenant missing')

  const db = await getTenantDb(tenant.databaseName)
  
  // Downstream: Where the record is the TARGET (e.g. Someone is the Parent OF this student)
  const parents = await db.entityRelation.findMany({
     where: { targetEntityId: recordPublicId },
     orderBy: { createdAt: 'desc' }
  })

  // Upstream: Where the record is the SOURCE (e.g. This parent has these children)
  const children = await db.entityRelation.findMany({
     where: { sourceEntityId: recordPublicId },
     orderBy: { createdAt: 'desc' }
  })

  // Hydrate exact basic info linearly
  const allEntityIds = Array.from(new Set([
    ...parents.map(p => p.sourceEntityId),
    ...children.map(c => c.targetEntityId)
  ]))

  const fullEntities = await db.businessEntity.findMany({
    where: { publicId: { in: allEntityIds }, deletedAt: null },
    select: { publicId: true, name: true, type: true, coreTrait: true, coreValue: true }
  })

  // Map contextual return bundles
  const InboundRelations = parents.map(p => {
    const hyd = fullEntities.find(f => f.publicId === p.sourceEntityId)
    // Keep return values serializable for client components/server actions.
    return { id: p.id.toString(), publicId: p.publicId, type: p.relationType, record: hyd ? { ...hyd, coreValue: hyd.coreValue ? Number(hyd.coreValue) : null } : null, direction: 'INBOUND' }
  }).filter(p => !!p.record)

  const OutboundRelations = children.map(c => {
    const hyd = fullEntities.find(f => f.publicId === c.targetEntityId)
    return { id: c.id.toString(), publicId: c.publicId, type: c.relationType, record: hyd ? { ...hyd, coreValue: hyd.coreValue ? Number(hyd.coreValue) : null } : null, direction: 'OUTBOUND' }
  }).filter(c => !!c.record)

  return [...InboundRelations, ...OutboundRelations]
}

// LINK NEW NODE IN THE GRAPH
export async function linkRecordsAction(
  sourceId: string,
  targetId: string,
  relationType: string,
  rootPageId: string,
  metadata?: Record<string, unknown>
) {
  const session = await getSession()
  if (!session || !session.tenantId) throw new Error('Unauthorized')

  const tenant = await masterDb.tenant.findUnique({ where: { id: session.tenantId } })
  if (!tenant) throw new Error('Tenant missing')

  const db = await getTenantDb(tenant.databaseName)
  
  // Validate safety
  if (sourceId === targetId) throw new Error('Paradox Error: Cannot link profile to itself')

  // JSON round-trip to satisfy Prisma's strict InputJsonValue type
  const metaJson = metadata ? JSON.parse(JSON.stringify(metadata)) : undefined

  await db.entityRelation.create({
     data: {
        sourceEntityId: sourceId,
        targetEntityId: targetId,
        relationType: relationType.toUpperCase().trim().replace(/\s+/g, '_'),
        ...(metaJson ? { metadata: metaJson } : {})
     }
  })

  revalidatePath(`/dashboard/modules/${rootPageId}`)
}
