import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { requireModule } from '@/lib/modules'
import TenantLogsClient from './_components/TenantLogsClient'

export const dynamic = 'force-dynamic'

export default async function TenantLogsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  // ── Module Guard: AUDIT ──────────────────────────────────────────────────
  await requireModule('AUDIT')

  return (
    <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
      <TenantLogsClient />
    </div>
  )
}
