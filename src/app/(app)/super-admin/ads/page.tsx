import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { masterDb } from '@/lib/db'
import GlobalAdsManager from './_components/GlobalAdsManager'

export const dynamic = 'force-dynamic'

export default async function SuperAdminAdsPage() {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') {
    redirect('/login')
  }

  // Fetch all active tenants so we can load them into the Ad Launcher & Provisioner
  const tenants = await masterDb.tenant.findMany({
    select: { id: true, name: true, subdomain: true, databaseName: true }
  })

  return (
    <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
      <GlobalAdsManager tenants={tenants} />
    </div>
  )
}
