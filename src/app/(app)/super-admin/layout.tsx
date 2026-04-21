import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import SuperAdminSidebar from './_components/SuperAdminSidebar'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { default: 'Super Admin', template: '%s | Super Admin | Nixvra' },
}

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  if (!session || session.role !== 'SUPER_ADMIN') {
    redirect('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: 'var(--bg-base)' }}>
      <SuperAdminSidebar session={session} />
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  )
}
