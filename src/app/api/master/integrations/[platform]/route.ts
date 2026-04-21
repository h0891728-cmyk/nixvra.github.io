import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { masterDb, getTenantDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/master/integrations/[platform]
 * Returns the status and safe metadata for a specific platform + tenant.
 * Secrets are NOT returned — only status indicators.
 * Query param: ?tenantId=xxx
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { platform } = await params
  const tenantId = req.nextUrl.searchParams.get('tenantId')

  if (!tenantId) return NextResponse.json({ error: 'tenantId query param required' }, { status: 400 })
  if (session.role !== 'SUPER_ADMIN' && session.tenantId !== tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await masterDb.tenant.findUnique({
    where: { id: tenantId },
    select: { databaseName: true, name: true },
  })
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const db = await getTenantDb(tenant.databaseName)
  const row = await db.tenantIntegration.findUnique({
    where: { provider: platform.toUpperCase() as never },
    select: {
      publicId: true, provider: true, isActive: true,
      webhookUrl: true, metadata: true,
      createdAt: true, updatedAt: true,
      // NEVER expose apiKey / accessToken / refreshToken
    },
  })

  if (!row) {
    return NextResponse.json({
      exists: false, platform: platform.toUpperCase(),
      tenantId, tenantName: tenant.name,
    })
  }

  return NextResponse.json({
    exists: true,
    platform: row.provider,
    isActive: row.isActive,
    webhookUrl: row.webhookUrl,
    metadata: row.metadata,
    connectedAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    tenantId,
    tenantName: tenant.name,
  })
}
