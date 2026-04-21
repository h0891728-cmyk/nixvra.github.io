import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { masterDb, getTenantDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * POST /api/super-admin/social/schedule
 * Updates a post's scheduledFor timestamp and sets status to SCHEDULED.
 * (QStash worker is not yet installed — scheduling is DB-native.
 *  The system polls for SCHEDULED posts with scheduledFor <= now and publishes them.)
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as {
    tenantId: string
    publicId: string
    scheduledFor: string  // ISO datetime string
  }

  if (!body.tenantId || !body.publicId || !body.scheduledFor) {
    return NextResponse.json({ error: 'tenantId, publicId, and scheduledFor are required' }, { status: 400 })
  }

  const scheduledDate = new Date(body.scheduledFor)
  if (isNaN(scheduledDate.getTime())) {
    return NextResponse.json({ error: 'Invalid scheduledFor date' }, { status: 400 })
  }
  if (scheduledDate <= new Date()) {
    return NextResponse.json({ error: 'scheduledFor must be in the future' }, { status: 400 })
  }

  try {
    const tenant = await masterDb.tenant.findUnique({
      where: { id: body.tenantId },
      select: { databaseName: true, name: true },
    })
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const db = await getTenantDb(tenant.databaseName)

    const existing = await db.socialPost.findUnique({ where: { publicId: body.publicId } })
    if (!existing) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    if (existing.status === 'PUBLISHED') {
      return NextResponse.json({ error: 'Cannot reschedule an already-published post' }, { status: 400 })
    }

    const updated = await db.socialPost.update({
      where: { publicId: body.publicId },
      data: {
        scheduledFor: scheduledDate,
        status: 'SCHEDULED',
      },
    })

    // Audit
    try {
      await db.auditLog.create({
        data: {
          action: 'SUPER_ADMIN_POST_SCHEDULED',
          entityType: 'SocialPost',
          entityId: body.publicId,
          userId: session.email,
          details: {
            tenantName: tenant.name,
            scheduledFor: scheduledDate.toISOString(),
            source: 'super_admin_command_center',
          },
        },
      })
    } catch (_) {}

    return NextResponse.json({
      success: true,
      post: { ...updated, id: String(updated.id) },
      scheduledFor: scheduledDate.toISOString(),
      note: 'Post status set to SCHEDULED. Background publisher will process at the specified time.',
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}

/**
 * DELETE /api/super-admin/social/schedule
 * Unschedule a post (revert SCHEDULED → DRAFT)
 */
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { tenantId, publicId } = await req.json() as { tenantId: string; publicId: string }
  if (!tenantId || !publicId) {
    return NextResponse.json({ error: 'tenantId and publicId are required' }, { status: 400 })
  }

  try {
    const tenant = await masterDb.tenant.findUnique({
      where: { id: tenantId },
      select: { databaseName: true },
    })
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const db = await getTenantDb(tenant.databaseName)
    const updated = await db.socialPost.update({
      where: { publicId },
      data: { scheduledFor: null, status: 'DRAFT' },
    })

    return NextResponse.json({ success: true, post: { ...updated, id: String(updated.id) } })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
