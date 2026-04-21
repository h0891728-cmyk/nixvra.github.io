'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { getScheduledPostsForCalendar, CalendarPost } from '@/actions/super-admin-social'

const PLATFORM_COLORS: Record<string, string> = {
  facebook: '#1877F2', instagram: '#E1306C', twitter: '#1DA1F2',
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#9898b8', SCHEDULED: '#f59e0b', PUBLISHED: '#10b981', FAILED: '#f43f5e',
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

interface DayPostsPopover { posts: CalendarPost[]; date: string; x: number; y: number }

export default function ContentCalendar() {
  const today = new Date()
  const [year,   setYear]   = useState(today.getFullYear())
  const [month,  setMonth]  = useState(today.getMonth())
  const [posts,  setPosts]  = useState<CalendarPost[]>([])
  const [loading, setLoading] = useState(true)
  const [popover, setPopover] = useState<DayPostsPopover | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getScheduledPostsForCalendar()
    setPosts(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const daysInMonth  = getDaysInMonth(year, month)
  const firstDay     = getFirstDayOfMonth(year, month)
  const totalCells   = Math.ceil((firstDay + daysInMonth) / 7) * 7

  // Build map: "YYYY-MM-DD" → CalendarPost[]
  const postsByDay = new Map<string, CalendarPost[]>()
  posts.forEach(p => {
    const d = new Date(p.scheduledFor)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    if (!postsByDay.has(key)) postsByDay.set(key, [])
    postsByDay.get(key)!.push(p)
  })

  function handleDayClick(dayNum: number, e: React.MouseEvent<HTMLDivElement>) {
    const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`
    const dayPosts = postsByDay.get(dateStr) || []
    if (dayPosts.length === 0) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPopover({ posts: dayPosts, date: dateStr, x: rect.left, y: rect.bottom + 8 })
  }

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}
      onClick={() => setPopover(null)}>

      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: '#00B077' }}>calendar_month</span>
          <div>
            <p style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>Content Calendar</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              {posts.length} scheduled post{posts.length !== 1 ? 's' : ''} across all tenants
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={() => load()} disabled={loading} style={{ padding: '0.45rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>refresh</span>
          </button>
          <button onClick={prevMonth} style={{ padding: '0.45rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>chevron_left</span>
          </button>
          <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text-primary)', minWidth: 160, textAlign: 'center' }}>
            {MONTHS[month]} {year}
          </span>
          <button onClick={nextMonth} style={{ padding: '0.45rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>chevron_right</span>
          </button>
          <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()) }} style={{ padding: '0.35rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
            Today
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ padding: '0.75rem 1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', borderBottom: '1px solid var(--border)', background: 'var(--bg-raised)' }}>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block' }} />
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{status.toLowerCase()}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          Click a day with posts to see details
        </div>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid var(--border)' }}>
        {DAYS.map(d => (
          <div key={d} style={{ padding: '0.625rem', textAlign: 'center', fontSize: '0.6875rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading calendar data...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
          {Array.from({ length: totalCells }, (_, i) => {
            const dayNum = i - firstDay + 1
            const isValidDay = dayNum > 0 && dayNum <= daysInMonth
            const dateStr = isValidDay
              ? `${year}-${String(month + 1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`
              : ''
            const dayPosts = isValidDay ? (postsByDay.get(dateStr) || []) : []
            const isToday = isValidDay && dayNum === today.getDate() && month === today.getMonth() && year === today.getFullYear()

            return (
              <div
                key={i}
                onClick={e => { e.stopPropagation(); isValidDay && handleDayClick(dayNum, e) }}
                style={{
                  minHeight: 96, padding: '0.5rem', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)',
                  background: isToday ? 'rgba(0,176,119,0.04)' : isValidDay ? 'transparent' : 'rgba(0,0,0,0.02)',
                  cursor: dayPosts.length > 0 ? 'pointer' : 'default',
                  transition: 'background 150ms',
                  position: 'relative',
                }}
              >
                {isValidDay && (
                  <>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: isToday ? 900 : 600,
                      background: isToday ? '#00B077' : 'transparent',
                      color: isToday ? '#fff' : 'var(--text-secondary)',
                      marginBottom: '0.375rem',
                    }}>
                      {dayNum}
                    </div>

                    {/* Post chips */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                      {dayPosts.slice(0, 3).map((p, idx) => {
                        const plats: string[] = Array.isArray(p.platforms) ? p.platforms : []
                        return (
                          <div key={idx} style={{
                            display: 'flex', alignItems: 'center', gap: 3,
                            padding: '0.125rem 0.375rem', borderRadius: 4, overflow: 'hidden',
                            background: `${STATUS_COLORS[p.status] || '#9898b8'}18`,
                            borderLeft: `2px solid ${STATUS_COLORS[p.status] || '#9898b8'}`,
                          }}>
                            {plats.slice(0, 2).map(pl => (
                              <span key={pl} style={{ width: 5, height: 5, borderRadius: '50%', background: PLATFORM_COLORS[pl] || '#888', flexShrink: 0 }} />
                            ))}
                            <span style={{ fontSize: '0.5625rem', color: 'var(--text-secondary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                              {p.tenant.name}
                            </span>
                          </div>
                        )
                      })}
                      {dayPosts.length > 3 && (
                        <div style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', fontWeight: 700, paddingLeft: 2 }}>
                          +{dayPosts.length - 3} more
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Popover */}
      {popover && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed', left: Math.min(popover.x, window.innerWidth - 320), top: popover.y,
            zIndex: 9999, width: 300, background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 12, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', overflow: 'hidden',
          }}
        >
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', margin: 0 }}>
              {new Date(popover.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <button onClick={() => setPopover(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>close</span>
            </button>
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {popover.posts.map((p, idx) => {
              const plats: string[] = Array.isArray(p.platforms) ? p.platforms : []
              return (
                <div key={idx} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.625rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 999, background: `${STATUS_COLORS[p.status]}18`, color: STATUS_COLORS[p.status] }}>{p.status}</span>
                    <span style={{ fontSize: '0.6875rem', color: '#00B077', fontWeight: 700 }}>{p.tenant.name}</span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.caption || '(No caption)'}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {plats.map(pl => <span key={pl} style={{ width: 7, height: 7, borderRadius: '50%', background: PLATFORM_COLORS[pl] || '#888' }} />)}
                    <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>
                      {new Date(p.scheduledFor).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
