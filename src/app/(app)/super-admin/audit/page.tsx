import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import GlobalAuditClient from './_components/GlobalAuditClient'

export const dynamic = 'force-dynamic'

export default async function SuperAdminAuditPage() {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') {
    redirect('/login')
  }

  return (
    <>
      <GlobalAuditClient />
    </>
  )
}
