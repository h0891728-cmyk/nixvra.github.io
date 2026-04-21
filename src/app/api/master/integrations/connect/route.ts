import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { masterDb, getTenantDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

type ConnectBody = {
  tenantId: string
  platform: string
  accessToken?: string
  refreshToken?: string
  apiKey?: string
  webhookUrl?: string
  metadata?: Record<string, unknown>
}

/**
 * POST /api/master/integrations/connect
 * Unified connection handler — OAuth tokens, API keys, SMTP credentials.
 * Tenants can only connect their own; Super Admin can connect any.
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: ConnectBody = await req.json()
  const { tenantId, platform, accessToken, refreshToken, apiKey, webhookUrl, metadata } = body

  if (!tenantId || !platform) {
    return NextResponse.json({ error: 'tenantId and platform are required' }, { status: 400 })
  }

  // Tenant users can only modify their own integrations
  if (session.role !== 'SUPER_ADMIN' && session.tenantId !== tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await masterDb.tenant.findUnique({
    where: { id: tenantId },
    select: { databaseName: true, name: true },
  })
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const db = await getTenantDb(tenant.databaseName)

  // Preserve secrets if placeholder (obfuscated string) is passed
  const existing = await db.tenantIntegration.findUnique({ where: { provider: platform as never } })
  const safeToken   = accessToken?.includes('****')  ? existing?.accessToken  : (accessToken  || null)
  const safeRefresh = refreshToken?.includes('****') ? existing?.refreshToken : (refreshToken  || null)
  const safeKey     = apiKey?.includes('****')       ? existing?.apiKey       : (apiKey        || null)

  const row = await db.tenantIntegration.upsert({
    where: { provider: platform as never },
    update: {
      accessToken: safeToken,
      refreshToken: safeRefresh,
      apiKey: safeKey,
      webhookUrl: webhookUrl || existing?.webhookUrl || null,
      metadata: (metadata ?? existing?.metadata ?? null) as never,
      isActive: true,
      deletedAt: null,
    },
    create: {
      provider: platform as never,
      accessToken: safeToken,
      refreshToken: safeRefresh,
      apiKey: safeKey,
      webhookUrl: webhookUrl || null,
      metadata: (metadata ?? null) as never,
      isActive: true,
    },
  })

  // Audit log (non-critical)
  try {
    await db.auditLog.create({
      data: {
        action: 'INTEGRATION_CONNECTED',
        entityType: 'TenantIntegration',
        entityId: row.publicId,
        userId: session.email,
        details: { platform, tenantName: tenant.name, source: 'master_integrations_api' },
      },
    })
  } catch (_) {}

  return NextResponse.json({
    success: true,
    publicId: row.publicId,
    message: `${platform} connected to ${tenant.name}`,
  })
}
