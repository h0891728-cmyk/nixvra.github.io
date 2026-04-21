import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { requireModule } from '@/lib/modules'
import MarketingHub from '@/components/dashboard/marketing/MarketingHub'

export const dynamic = 'force-dynamic'

export default async function TenantMarketingPage() {
  const session = await getSession()
  if (!session || !session.tenantId) redirect('/login')

  // ── Module Guard: ADS or SOCIAL ──────────────────────────────────────────
  await requireModule('ADS', 'SOCIAL')

  return (
    <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
      <MarketingHub tenantId={session.tenantId} />
    </div>
  )
}
