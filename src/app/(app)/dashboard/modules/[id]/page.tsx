import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { getRecordProfileAction, getCustomFieldsAndValuesAction } from '@/actions/tenant-profile'
import { getRecentAttendanceAction } from '@/actions/tenant-attendance'
import { getRecordTimelineAction } from '@/actions/tenant-timeline'
import { getRecordRelationsAction } from '@/actions/tenant-relations'
import RecordProfileClient from '../_components/RecordProfileClient'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ModuleRecordProfilePage(props: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !session.tenantId) {
    redirect('/login')
  }

  const { id } = await props.params

  // 1. Fetch Core Profile ID securely via isolated action
  const record = await getRecordProfileAction(id)
  
  if (!record) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: '#f43f5e', fontWeight: 800 }}>
         Error 404: Record profile not found in your workspace database.
      </div>
    )
  }

  // 2. Hydrate Dynamic Schema definition uniquely mapped to this record category
  const fields = await getCustomFieldsAndValuesAction(record.publicId, record.type as string)

  // 3. Hydrate Recent Attendance Log Array natively
  const attendanceLogs = await getRecentAttendanceAction(record.publicId)

  // 4. Hydrate Timeline Interactions natively
  const timelineEvents = await getRecordTimelineAction(record.publicId)

  // 5. Hydrate Universal Polymorphic Matrix Links
  const linkMatrix = await getRecordRelationsAction(record.publicId)

  return (
    <div style={{ padding: '2rem', maxWidth: 1400, margin: '0 auto' }}>
      
      {/* breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
         <Link href="/dashboard/modules" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}>
            Polymorphic Modules
         </Link>
         <span style={{ color: 'var(--text-muted)' }}>/</span>
         <span style={{ fontWeight: 800, color: '#00B077', fontSize: '0.875rem' }}>{record.name}</span>
      </div>

      <RecordProfileClient 
         record={record} 
         fields={fields} 
         attendanceLogs={attendanceLogs}
         timelineEvents={timelineEvents}
         linkMatrix={linkMatrix}
      />
    </div>
  )
}
