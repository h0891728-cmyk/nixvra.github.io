import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import GlobalWebhooksClient from './_components/GlobalWebhooksClient'

export const dynamic = 'force-dynamic'

export default async function SuperAdminWebhooksPage() {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') {
    redirect('/login')
  }

  return (
    <>
      <GlobalWebhooksClient />
    </>
  )
}
