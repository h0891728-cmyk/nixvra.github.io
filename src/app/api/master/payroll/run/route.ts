import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { runTenantPayroll } from '@/actions/payroll'
import { masterDb, getTenantDb } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // List recent runs across all tenants
  const tenants = await masterDb.tenant.findMany({ select: { name: true, databaseName: true } })
  const results: any[] = []

  await Promise.all(tenants.map(async t => {
    try {
      const db = await getTenantDb(t.databaseName)
      const runs = await db.payrollRun.findMany({ take: 5, orderBy: { createdAt: 'desc' } })
      runs.forEach(r => results.push({ tenant: t.name, ...r }))
    } catch (_) {}
  }))

  return NextResponse.json({ runs: results })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tenantId, month, year } = await req.json()
  if (!tenantId || !month || !year) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  try {
    const result = await runTenantPayroll(tenantId, month, year)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
