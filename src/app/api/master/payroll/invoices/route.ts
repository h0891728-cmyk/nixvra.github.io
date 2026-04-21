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
      const invs = await db.invoice.findMany({ 
        take: 10, orderBy: { createdAt: 'desc' },
      })
      invs.forEach(inv => results.push({ tenant: t.name, ...inv }))
    } catch (_) {}
  }))

  return NextResponse.json({ invoices: results })
}
