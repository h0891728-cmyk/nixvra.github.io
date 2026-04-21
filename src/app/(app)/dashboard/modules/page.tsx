import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { getTenantRecordsAction } from '@/actions/tenant-records'
import { masterDb } from '@/lib/db'
import { requireModule } from '@/lib/modules'
import TenantModulesClient from './_components/TenantModulesClient'

export const dynamic = 'force-dynamic'

export default async function TenantModulesPage() {
  const session = await getSession()
  if (!session || !session.tenantId) redirect('/login')

  // ── Module Guard: CRM ────────────────────────────────────────────────────
  await requireModule('CRM')

  const tenant = await masterDb.tenant.findUnique({ where: { id: session.tenantId } })
  if (!tenant) return null

  // Fetch all CRM records natively mapped to this isolated workspace
  const records = await getTenantRecordsAction()

  return (
    <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
      <TenantModulesClient 
        records={records} 
        industry={tenant.industry} 
        tenantName={tenant.name}
      />
    </div>
  )
}
