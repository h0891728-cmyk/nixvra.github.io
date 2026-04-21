import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { masterDb } from '@/lib/db'
import LandingSettingsClient from './_components/LandingSettingsClient'

export const dynamic = 'force-dynamic'

export default async function LandingSettingsPage() {
  const session = await getSession()
  if (!session?.tenantId) redirect('/login')

  const tenant = await masterDb.tenant.findUnique({
    where: { id: session.tenantId },
    select: { id: true, name: true, subdomain: true, logoUrl: true, tagline: true, primaryColor: true, landingPage: true },
  })

  if (!tenant) redirect('/dashboard')

  return (
    <div style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>
      <LandingSettingsClient
        tenantName={tenant.name}
        tenantSubdomain={tenant.subdomain}
        initial={{
          logoUrl: tenant.logoUrl ?? '',
          tagline: tenant.tagline ?? '',
          primaryColor: tenant.primaryColor ?? '#00B077',
          landingPage: (tenant.landingPage as any) ?? {},
        }}
      />
    </div>
  )
}

