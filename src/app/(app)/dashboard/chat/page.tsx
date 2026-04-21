import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { requireModule, requireServiceEnabled } from '@/lib/modules'
import TenantChatConsole from '@/components/dashboard/chat/TenantChatConsole'

export const dynamic = 'force-dynamic'

export default async function TenantChatPage() {
  const session = await getSession()
  if (!session?.tenantId) redirect('/login')

  await requireModule('SOCIAL')
  await requireServiceEnabled('CHAT')

  return (
    <div style={{ padding: '2rem', maxWidth: 1160, margin: '0 auto' }}>
      <TenantChatConsole tenantId={session.tenantId} />
    </div>
  )
}
