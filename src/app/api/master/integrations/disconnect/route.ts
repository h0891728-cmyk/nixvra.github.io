import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { masterDb, getTenantDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * POST /api/master/integrations/disconnect
 * Sets isActive=false, clears tokens, soft-deletes the integration row.
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tenantId, platform } = await req.json() as { tenantId: string; platform: string }

  if (!tenantId || !platform) {
    return NextResponse.json({ error: 'tenantId and platform are required' }, { status: 400 })
  }

  if (session.role !== 'SUPER_ADMIN' && session.tenantId !== tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await masterDb.tenant.findUnique({
    where: { id: tenantId },
    select: { databaseName: true, name: true },
  })
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const db = await getTenantDb(tenant.databaseName)

  try {
    const row = await db.tenantIntegration.update({
      where: { provider: platform as never },
      data: {
        isActive: false,
        accessToken: null,
        refreshToken: null,
        apiKey: null,
        deletedAt: new Date(),
      },
    })

    // Audit log
    try {
      await db.auditLog.create({
        data: {
          action: 'INTEGRATION_DISCONNECTED',
          entityType: 'TenantIntegration',
          entityId: row.publicId,
          userId: session.email,
          details: { platform, tenantName: tenant.name, source: 'master_integrations_api' },
        },
      })
    } catch (_) {}

    return NextResponse.json({ success: true, message: `${platform} disconnected from ${tenant.name}` })
  } catch {
    return NextResponse.json({ error: `No ${platform} integration found for this tenant` }, { status: 404 })
  }
}
