import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { masterDb, getTenantDb } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenants = await masterDb.tenant.findMany({ select: { name: true, databaseName: true } })
  const results: any[] = []

  await Promise.all(tenants.map(async t => {
    try {
      const db = await getTenantDb(t.databaseName)
      const gw = await db.tenantIntegration.findMany({ where: { provider: { in: ['STRIPE', 'RAZORPAY'] as any } } })
      gw.forEach(g => results.push({ tenant: t.name, provider: g.provider, isActive: g.isActive }))
    } catch (_) {}
  }))

  return NextResponse.json({ gateways: results })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { tenantId, provider, isActive } = await req.json()

  const tenant = await masterDb.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const db = await getTenantDb(tenant.databaseName)
  await db.tenantIntegration.upsert({
    where: { provider: provider as any },
    update: { isActive },
    create: { provider: provider as any, isActive }
  })

  return NextResponse.json({ success: true })
}
