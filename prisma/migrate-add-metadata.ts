/**
 * OMNICORE OS — Tenant DB Migration Script
 * Adds missing `metadata` column to social_posts table
 * across ALL tenant databases safely (no data loss).
 */

import * as dotenv from 'dotenv'

async function run() {
  dotenv.config({ path: '.env.local' })
  const { masterDb, getTenantDb } = await import('../src/lib/db')

  console.log('🔄 Starting migration: Add metadata column to social_posts...\n')

  const tenants = await masterDb.tenant.findMany({
    select: { id: true, name: true, databaseName: true }
  })

  console.log(`Found ${tenants.length} tenant(s)\n`)

  for (const tenant of tenants) {
    console.log(`⚙️  Processing: ${tenant.name} (${tenant.databaseName})`)
    
    try {
      const db = await getTenantDb(tenant.databaseName)

      // Check if metadata column exists using raw query
      const result: Record<string, unknown>[] = await db.$queryRawUnsafe(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'social_posts' AND COLUMN_NAME = 'metadata'`,
        tenant.databaseName
      )

      if (result.length > 0) {
        console.log(`  ✅ metadata column already exists — skipping`)
        continue
      }

      // Add the column
      await db.$executeRawUnsafe(
        `ALTER TABLE \`social_posts\` ADD COLUMN \`metadata\` JSON NULL`
      )
      console.log(`  ✅ Added metadata column to social_posts`)

      // Also check and add metadata to ad_campaigns.metrics if it's missing
      const metricsCheck: Record<string, unknown>[] = await db.$queryRawUnsafe(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'ad_campaigns' AND COLUMN_NAME = 'metrics'`,
        tenant.databaseName
      )
      if (metricsCheck.length === 0) {
        await db.$executeRawUnsafe(
          `ALTER TABLE \`ad_campaigns\` ADD COLUMN \`metrics\` JSON NULL`
        )
        console.log(`  ✅ Added metrics column to ad_campaigns`)
      } else {
        console.log(`  ✅ metrics column already exists in ad_campaigns`)
      }

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  ❌ Error for ${tenant.databaseName}: ${msg}`)
    }
  }

  console.log('\n🎉 Migration complete!')
  await masterDb.$disconnect()
}

run().catch(e => {
  console.error('Fatal error:', e)
  process.exit(1)
})
