import { NextResponse } from 'next/server'
import { masterDb } from '@/lib/db'

export async function GET() {
  const tenants = await masterDb.tenant.findMany({
    select: { id: true, name: true, databaseName: true }
  })
  return NextResponse.json(tenants)
}
