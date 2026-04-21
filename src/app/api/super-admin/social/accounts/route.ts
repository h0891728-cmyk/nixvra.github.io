import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { masterDb, getTenantDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

interface ConnectedAccount {
  tenantId: string
  tenantName: string
  tenantSubdomain: string
  provider: string
  isActive: boolean
  accountName: string | null
  pageCount: number
  connectedAt: string | null
  metadata: Record<string, unknown>
}

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenants = await masterDb.tenant.findMany({
    select: { id: true, name: true, subdomain: true, databaseName: true },
  })

  const accounts: ConnectedAccount[] = []

  await Promise.all(tenants.map(async (t) => {
    try {
      const db = await getTenantDb(t.databaseName)
      const integrations = await db.tenantIntegration.findMany({
        where: {
          provider: { in: ['META_GRAPH', 'WHATSAPP_CLOUD'] as never[] },
          isActive: true,
          deletedAt: null,
        },
        select: { provider: true, isActive: true, metadata: true, createdAt: true },
      })

      integrations.forEach(integration => {
        const meta = (integration.metadata || {}) as Record<string, unknown>
        const pages = (meta.pages as unknown[]) || []

        accounts.push({
          tenantId: t.id,
          tenantName: t.name,
          tenantSubdomain: t.subdomain,
          provider: integration.provider,
          isActive: integration.isActive,
          accountName: (meta.accountName as string) || null,
          pageCount: pages.length,
          connectedAt: integration.createdAt ? integration.createdAt.toISOString() : null,
          metadata: {
            whatsappPhoneNumberId: meta.whatsappPhoneNumberId || null,
            whatsappBusinessAccountId: meta.whatsappBusinessAccountId || null,
            pageNames: pages.map((p: unknown) => {
              const page = p as Record<string, unknown>
              return page.name
            }),
          },
        })
      })
    } catch (_) { /* ignore unreachable DBs */ }
  }))

  // Summary
  const summary = {
    totalConnected: accounts.length,
    metaAccounts: accounts.filter(a => a.provider === 'META_GRAPH').length,
    whatsappAccounts: accounts.filter(a => a.provider === 'WHATSAPP_CLOUD').length,
    tenantsWithNoAccount: tenants.length - new Set(accounts.map(a => a.tenantId)).size,
  }

  return NextResponse.json({ accounts, summary })
}
