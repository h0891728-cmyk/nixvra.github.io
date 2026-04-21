import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { masterDb } from '@/lib/db'
import ServicesSettingsClient from './_components/ServicesSettingsClient'

export const dynamic = 'force-dynamic'

export default async function ServicesSettingsPage() {
  const session = await getSession()
  if (!session?.tenantId) redirect('/login')

  const tenant = await masterDb.tenant.findUnique({
    where: { id: session.tenantId },
    select: { id: true, name: true, modules: true, services: true },
  })

  if (!tenant) redirect('/dashboard')

  return (
    <div style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>
      <ServicesSettingsClient
        tenantName={tenant.name}
        entitledModules={(tenant.modules as string[]) ?? []}
        services={(tenant.services as Record<string, boolean> | null) ?? null}
      />
    </div>
  )
}

