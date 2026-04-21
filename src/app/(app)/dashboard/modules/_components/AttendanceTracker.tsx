'use client'

import React, { useState, useTransition } from 'react'
import { markRecordAttendanceAction } from '@/actions/tenant-attendance'

export default function AttendanceTracker({ record, logs }: { record: any, logs: any[] }) {
  const [isPending, startTransition] = useTransition()
  
  // Format today's date for defaults
  const todayStr = new Date().toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState(todayStr)

  // Find if log exists for selected date
  const selectedLog = logs.find(l => {
     const dbDate = new Date(l.date).toISOString().split('T')[0]
     return dbDate === selectedDate
  })

  // Quick Stats
  const presentCount = logs.filter(l => l.status === 'PRESENT').length
  const lateCount = logs.filter(l => l.status === 'LATE').length
  const absentCount = logs.filter(l => l.status === 'ABSENT').length

  const handleMark = (status: string) => {
    startTransition(async () => {
      try {
        await markRecordAttendanceAction(record.publicId, selectedDate, status, '')
      } catch (err) {
        console.error(err)
      }
    })
  }

  const renderStatusBox = (status: string, label: string, color: string, bg: string, icon: string) => {
      const isActive = selectedLog?.status === status
      return (
         <button 
           onClick={() => handleMark(status)}
           disabled={isPending}
           style={{
             flex: 1, padding: '1rem', borderRadius: 12, cursor: 'pointer',
             border: isActive ? `2px solid ${color}` : '1px solid var(--border)',
             background: isActive ? bg : 'var(--bg-raised)',
             display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
             color: isActive ? color : 'var(--text-secondary)',
             transition: 'all 0.2s', opacity: isPending ? 0.6 : 1
           }}
         >
            <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', opacity: isActive ? 1 : 0.5 }}>{icon}</span>
            <span style={{ fontWeight: 800, fontSize: '0.8125rem' }}>{label}</span>
         </button>
      )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
       {/* Command Registry */}
       <div style={{ background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
             <div>
               <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Attendance Command</h3>
               <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Overriding state logs natively into TiDB.</p>
             </div>
             <div>
               <input 
                 type="date" 
                 value={selectedDate}
                 onChange={e => setSelectedDate(e.target.value)}
                 style={{ padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--text-primary)', outline: 'none', fontWeight: 600 }}
               />
             </div>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
             {renderStatusBox('PRESENT', 'Present', '#10b981', 'rgba(16,185,129,0.1)', 'check_circle')}
             {renderStatusBox('ABSENT', 'Absent', '#f43f5e', 'rgba(244,63,94,0.1)', 'cancel')}
             {renderStatusBox('LATE', 'Late Entry', '#f59e0b', 'rgba(245,158,11,0.1)', 'schedule')}
             {renderStatusBox('HALF_DAY', 'Half Day', '#3b82f6', 'rgba(59,130,246,0.1)', 'hourglass_bottom')}
             {renderStatusBox('ON_LEAVE', 'On Leave', '#008E60', 'rgba(0,142,96,0.1)', 'flight_takeoff')}
          </div>
       </div>

       {/* Heatmap / Visual Logic */}
       <div>
         <h3 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Recent Trajectory (60 Days)</h3>
         {logs.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-surface)', border: '1px dashed var(--border)', borderRadius: 12, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
               No attendance records located for this profile.
            </div>
         ) : (
            <>
               <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.8125rem' }}><b style={{ color: '#10b981' }}>{presentCount}</b> Present</div>
                  <div style={{ fontSize: '0.8125rem' }}><b style={{ color: '#f59e0b' }}>{lateCount}</b> Late</div>
                  <div style={{ fontSize: '0.8125rem' }}><b style={{ color: '#f43f5e' }}>{absentCount}</b> Absent</div>
               </div>

               <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                 {logs.map(log => {
                    let color = 'var(--bg-raised)'
                    if (log.status === 'PRESENT') color = '#10b981'
                    if (log.status === 'ABSENT') color = '#f43f5e'
                    if (log.status === 'LATE') color = '#f59e0b'
                    if (log.status === 'HALF_DAY') color = '#3b82f6'
                    if (log.status === 'ON_LEAVE') color = '#008E60'

                    return (
                       <div key={log.id} title={`${new Date(log.date).toLocaleDateString()} - ${log.status}`} style={{
                          width: 20, height: 20, borderRadius: 4, background: color, opacity: 0.85
                       }} />
                    )
                 })}
               </div>
            </>
         )}
       </div>
    </div>
  )
}
