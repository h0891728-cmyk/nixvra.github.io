import { NextResponse } from 'next/server'
import { masterDb, getTenantDb } from '@/lib/db'

/**
 * GET /api/admin/migrate-email-verification
 * One-time endpoint to add emailVerified, emailVerificationToken,
 * emailVerificationExpiry, and googleId columns to all tenant `users` tables.
 *
 * Protected by a simple secret header: X-Migrate-Secret
 * Delete this file after running once.
 */
export async function GET(req: Request) {
  const secret = req.headers.get('x-migrate-secret')
  if (secret !== (process.env.SESSION_SECRET || '').slice(0, 16)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenants = await masterDb.tenant.findMany({
    select: { id: true, name: true, databaseName: true },
  })
  tenants.push({ id: 'HQ', name: 'Nixvra HQ', databaseName: 'omnicore_hq' } as any)

  const results: { tenant: string; status: string; detail?: string }[] = []

  const migrations = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS emailVerified BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS emailVerificationToken VARCHAR(255) NULL`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS emailVerificationExpiry DATETIME NULL`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS googleId VARCHAR(255) NULL`,
  ]

  for (const t of tenants) {
    try {
      const db = await getTenantDb(t.databaseName)
      for (const sql of migrations) {
        await db.$executeRawUnsafe(sql)
      }
      // Mark existing users as verified (they were created before verification existed)
      await db.$executeRawUnsafe(
        `UPDATE users SET emailVerified = TRUE WHERE emailVerified = FALSE`
      )
      results.push({ tenant: t.name, status: 'ok' })
    } catch (e: any) {
      results.push({ tenant: t.name, status: 'error', detail: e.message?.slice(0, 200) })
    }
  }

  return NextResponse.json({ results })
}
