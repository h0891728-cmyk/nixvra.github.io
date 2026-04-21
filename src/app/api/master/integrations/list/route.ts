import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { masterDb, getTenantDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/master/integrations/list
 * Returns all tenants × all platforms cross-tenant summary for Super Admin.
 */
export async function GET(_req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenants = await masterDb.tenant.findMany({
    select: { id: true, name: true, subdomain: true, industry: true, databaseName: true },
    orderBy: { name: 'asc' },
  })

  const results: Record<string, unknown>[] = []

  await Promise.all(tenants.map(async (t) => {
    try {
      const db = await getTenantDb(t.databaseName)
      const rows = await db.tenantIntegration.findMany({
        where: { deletedAt: null },
        select: {
          publicId: true, provider: true, isActive: true,
          webhookUrl: true, metadata: true,
          createdAt: true, updatedAt: true,
          // Do NOT send apiKey / accessToken / refreshToken to frontend
        },
      })
      rows.forEach(r => {
        results.push({
          publicId: r.publicId,
          provider: r.provider,
          isActive: r.isActive,
          webhookUrl: r.webhookUrl,
          metadata: r.metadata,
          connectedAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
          tenant: {
            id: t.id,
            name: t.name,
            subdomain: t.subdomain,
            industry: t.industry,
          },
        })
      })
    } catch (_) { /* ignore unreachable tenant DB */ }
  }))

  // Per-platform summary
  const summary: Record<string, { total: number; active: number }> = {}
  results.forEach((r) => {
    const p = r.provider as string
    if (!summary[p]) summary[p] = { total: 0, active: 0 }
    summary[p].total++
    if (r.isActive) summary[p].active++
  })

  return NextResponse.json({
    integrations: results,
    summary,
    tenantCount: tenants.length,
    totalConnections: results.length,
  })
}
