import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { masterDb } from '@/lib/db'
import TenantDomainsClient from './_components/TenantDomainsClient'

export const dynamic = 'force-dynamic'

export default async function TenantDomainsPage() {
  const session = await getSession()
  if (!session || !session.tenantId) {
    redirect('/login')
  }

  // Fetch the active domains strictly for this logged-in tenant
  const localDomains = await masterDb.tenantDomain.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
      <TenantDomainsClient 
        domains={localDomains} 
        tenantId={session.tenantId} 
      />
    </div>
  )
}
