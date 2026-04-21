import { NextRequest, NextResponse } from 'next/server'
import { masterDb, getTenantDb } from '@/lib/db'

/**
 * GET /api/admin/migrate-metadata
 * Adds missing `metadata` column to social_posts and `metrics` column 
 * to ad_campaigns across ALL tenant databases.
 * 
 * Run this ONCE after deploying. Safe to run multiple times.
 */
export async function GET(request: NextRequest) {
  // Simple auth check - only allow from localhost
  const host = request.headers.get('host') || ''
  if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
    return NextResponse.json({ error: 'Only accessible from localhost' }, { status: 403 })
  }

  const results: any[] = []

  try {
    const tenants = await masterDb.tenant.findMany({
      select: { id: true, name: true, databaseName: true }
    })

    for (const tenant of tenants) {
      const result: any = { tenant: tenant.name, db: tenant.databaseName, actions: [] }
      
      try {
        const db = await getTenantDb(tenant.databaseName)

        // ── social_posts.metadata ──
        const spTable: any[] = await db.$queryRawUnsafe(
          `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
           WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'social_posts'`,
          tenant.databaseName
        )

        if (spTable.length > 0) {
          const spMeta: any[] = await db.$queryRawUnsafe(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'social_posts' AND COLUMN_NAME = 'metadata'`,
            tenant.databaseName
          )
          if (spMeta.length === 0) {
            await db.$executeRawUnsafe(
              `ALTER TABLE \`social_posts\` ADD COLUMN \`metadata\` JSON NULL`
            )
            result.actions.push('✅ Added metadata to social_posts')
          } else {
            result.actions.push('⏭️ social_posts.metadata already exists')
          }
        } else {
          result.actions.push('⚠️ social_posts table not found')
        }

        // ── ad_campaigns.metrics ──
        const acTable: any[] = await db.$queryRawUnsafe(
          `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
           WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'ad_campaigns'`,
          tenant.databaseName
        )

        if (acTable.length > 0) {
          const acMetrics: any[] = await db.$queryRawUnsafe(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'ad_campaigns' AND COLUMN_NAME = 'metrics'`,
            tenant.databaseName
          )
          if (acMetrics.length === 0) {
            await db.$executeRawUnsafe(
              `ALTER TABLE \`ad_campaigns\` ADD COLUMN \`metrics\` JSON NULL`
            )
            result.actions.push('✅ Added metrics to ad_campaigns')
          } else {
            result.actions.push('⏭️ ad_campaigns.metrics already exists')
          }

          // ── ad_campaigns.metaCampaignId ──
          const acMetaId: any[] = await db.$queryRawUnsafe(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'ad_campaigns' AND COLUMN_NAME = 'metaCampaignId'`,
            tenant.databaseName
          )
          if (acMetaId.length === 0) {
            await db.$executeRawUnsafe(
              `ALTER TABLE \`ad_campaigns\` ADD COLUMN \`metaCampaignId\` VARCHAR(100) NULL`
            )
            result.actions.push('✅ Added metaCampaignId to ad_campaigns')
          } else {
            result.actions.push('⏭️ ad_campaigns.metaCampaignId already exists')
          }
        } else {
          result.actions.push('⚠️ ad_campaigns table not found')
        }

      } catch (e: any) {
        result.error = e.message
      }

      results.push(result)
    }

    return NextResponse.json({
      success: true,
      message: 'Migration complete! Refresh your browser.',
      results,
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
