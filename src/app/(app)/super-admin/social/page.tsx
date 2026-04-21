import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { masterDb } from '@/lib/db'
import GlobalSocialHub from './_components/GlobalSocialHub'
import GlobalSocialCharts from './_components/GlobalSocialCharts'
import { getGlobalSocialAnalytics } from '@/actions/super-admin-social'

export const dynamic = 'force-dynamic'

export default async function SuperAdminSocialPage() {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') {
    redirect('/login')
  }

  // Fetch cross-tenant metrics for the chart (default 30 days)
  const chartData = await getGlobalSocialAnalytics(30)

  // Find the HQ underlying tenant ID so we can pass it down for posting
  const hqTenant = await masterDb.tenant.findFirst({
    where: { databaseName: 'omnicore_hq' }
  })

  if (!hqTenant) {
    return <div>HQ Tenant missing — system error.</div>
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
      <GlobalSocialCharts data={chartData} />
      <GlobalSocialHub hqTenantId={hqTenant.id} />
    </div>
  )
}
