import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { masterDb, getTenantDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const status  = searchParams.get('status')   // e.g. DRAFT, SCHEDULED, PUBLISHED, FAILED
  const tenantId = searchParams.get('tenantId') // filter to one tenant
  const take     = Math.min(parseInt(searchParams.get('take') || '100', 10), 200)

  const tenants = tenantId
    ? await masterDb.tenant.findMany({ where: { id: tenantId }, select: { id: true, name: true, subdomain: true, databaseName: true } })
    : await masterDb.tenant.findMany({ select: { id: true, name: true, subdomain: true, databaseName: true } })

  const results: Record<string, unknown>[] = []

  await Promise.all(tenants.map(async (t) => {
    try {
      const db = await getTenantDb(t.databaseName)
      const posts = await db.socialPost.findMany({
        where: {
          deletedAt: null,
          ...(status ? { status: status as never } : {}),
        },
        take,
        orderBy: { createdAt: 'desc' },
      })

      posts.forEach(p => {
        results.push({
          ...p,
          id: String(p.id),
          tenant: { id: t.id, name: t.name, subdomain: t.subdomain },
        })
      })
    } catch (_) { /* ignore unreachable DBs */ }
  }))

  results.sort((a, b) => {
    const aDate = (a.createdAt as Date).getTime()
    const bDate = (b.createdAt as Date).getTime()
    return bDate - aDate
  })

  return NextResponse.json({ posts: results, total: results.length })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as {
    tenantIds: string[]  // one or more tenant IDs
    platforms: string[]
    caption: string
    mediaUrl?: string
    scheduledFor?: string
    metadata?: Record<string, unknown>
  }

  if (!body.tenantIds?.length || !body.caption) {
    return NextResponse.json({ error: 'tenantIds and caption are required' }, { status: 400 })
  }

  const created: Record<string, unknown>[] = []
  const errors: { tenantId: string; error: string }[] = []

  await Promise.all(body.tenantIds.map(async (tenantId) => {
    try {
      const tenant = await masterDb.tenant.findUnique({
        where: { id: tenantId },
        select: { databaseName: true, name: true },
      })
      if (!tenant) throw new Error('Tenant not found')

      const db = await getTenantDb(tenant.databaseName)
      const post = await db.socialPost.create({
        data: {
          platforms: body.platforms,
          caption: body.caption,
          mediaUrl: body.mediaUrl || '',
          scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : null,
          status: body.scheduledFor ? 'SCHEDULED' : 'DRAFT',
          metadata: (body.metadata || {}) as never,
        },
      })

      // Write audit log
      try {
        await db.auditLog.create({
          data: {
            action: 'SUPER_ADMIN_SOCIAL_POST_CREATED',
            entityType: 'SocialPost',
            entityId: post.publicId,
            userId: session.email,
            details: {
              tenantName: tenant.name,
              platforms: body.platforms.join(','),
              status: post.status,
              scheduledFor: body.scheduledFor || null,
              source: 'super_admin_command_center',
            },
          },
        })
      } catch (_) { /* audit write is non-critical */ }

      created.push({ ...post, id: String(post.id), tenantId })
    } catch (err: unknown) {
      errors.push({ tenantId, error: err instanceof Error ? err.message : 'Unknown error' })
    }
  }))

  return NextResponse.json({ created, errors, success: created.length > 0 })
}
