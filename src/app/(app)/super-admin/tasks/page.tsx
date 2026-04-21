import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import GlobalTasksClient from './_components/GlobalTasksClient'

export const dynamic = 'force-dynamic'

export default async function SuperAdminTasksPage() {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') {
    redirect('/login')
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
      <GlobalTasksClient />
    </div>
  )
}
