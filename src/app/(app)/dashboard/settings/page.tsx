import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { getUserProfileAction } from '@/actions/user-profile'
import ProfileSettingsClient from './_components/ProfileSettingsClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Profile & Settings' }
export const dynamic = 'force-dynamic'

export default async function ProfileSettingsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const profile = await getUserProfileAction()
  if (!profile) redirect('/login')

  return (
    <div style={{ padding: '2rem' }}>
      <ProfileSettingsClient profile={profile} />
    </div>
  )
}
