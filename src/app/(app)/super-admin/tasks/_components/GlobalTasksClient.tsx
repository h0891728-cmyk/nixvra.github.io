'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { getTasks, createTask, updateTaskStatus, deleteTask } from '@/actions/super-admin-tasks'

const PRIORITIES: Record<string, { color: string; label: string }> = {
  LOW: { color: '#10b981', label: 'Low Detail' },
  MEDIUM: { color: '#3b82f6', label: 'Routine' },
  HIGH: { color: '#f59e0b', label: 'High Priority' },
  URGENT: { color: '#f43f5e', label: 'Critical / Urgent' },
}

export default function GlobalTasksClient() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('MEDIUM')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getTasks()
    setTasks(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setIsSubmitting(true)
    await createTask({ title, priority })
    setTitle('')
    setPriority('MEDIUM')
    setIsSubmitting(false)
    load()
  }

  const columns = [
    { id: 'TODO', label: 'Inbox / Todo' },
    { id: 'IN_PROGRESS', label: 'In Execution' },
    { id: 'REVIEW', label: 'Awaiting Audit' },
    { id: 'DONE', label: 'Completed' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.75rem', color: '#10b981' }}>task_alt</span>
            HQ Operations Board
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
            Internal task management system for executing Super Admin deployments and reviews.
          </p>
        </div>
      </div>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem', marginBottom: '2rem' }}>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="What needs to be executed?"
            value={title}
            onChange={e => setTitle(e.target.value)}
            disabled={isSubmitting}
            style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--text-primary)' }}
          />
          <select
             value={priority}
             onChange={e => setPriority(e.target.value)}
             disabled={isSubmitting}
             style={{ padding: '0.75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--text-primary)' }}
          >
            {Object.keys(PRIORITIES).map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isSubmitting || !title.trim()}
            style={{ padding: '0.75rem 1.5rem', borderRadius: 8, background: '#10b981', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', opacity: isSubmitting ? 0.7 : 1 }}
          >
            Deploy Directive
          </button>
        </form>
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Synchronizing board payload...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', alignItems: 'flex-start' }}>
          {columns.map(col => {
            const columnTasks = tasks.filter(t => t.status === col.id)
            return (
              <div key={col.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>{col.label}</h3>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--bg-raised)', padding: '0.1rem 0.4rem', borderRadius: 999 }}>{columnTasks.length}</span>
                </div>
                
                {columnTasks.map(task => {
                  const pri = PRIORITIES[task.priority]
                  return (
                    <div key={task.publicId} style={{ background: 'var(--bg-raised)', padding: '1rem', borderRadius: 12, border: '1px solid var(--border)', borderLeft: `3px solid ${pri.color}` }}>
                      <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>{task.title}</p>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: pri.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{pri.label}</span>
                        
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                           {col.id !== 'TODO' && (
                             <button onClick={() => { updateTaskStatus(task.publicId, columns[columns.findIndex(c => c.id === col.id) - 1].id); load() }} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 4, cursor: 'pointer', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                               <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>chevron_left</span>
                             </button>
                           )}
                           {col.id !== 'DONE' ? (
                             <button onClick={() => { updateTaskStatus(task.publicId, columns[columns.findIndex(c => c.id === col.id) + 1].id); load() }} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 4, cursor: 'pointer', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                               <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>chevron_right</span>
                             </button>
                           ) : (
                             <button onClick={() => { deleteTask(task.publicId); load() }} style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: '#f43f5e', borderRadius: 4, cursor: 'pointer', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                               <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>close</span>
                             </button>
                           )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
