'use client'

import { exitImpersonationAction } from '@/actions/auth'
import { useTransition } from 'react'

export default function ImpersonationBanner({ userName }: { userName: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <div style={{
      background: 'linear-gradient(90deg, #f59e0b 0%, #ea580c 100%)',
      color: '#fff',
      padding: '0.5rem 1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
      fontSize: '0.8125rem',
      fontWeight: 700,
      zIndex: 9999,
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>visibility</span>
        <span>Impersonating: <strong style={{ textDecoration: 'underline' }}>{userName}</strong></span>
      </div>
      
      <button 
        onClick={() => startTransition(() => exitImpersonationAction())}
        disabled={isPending}
        style={{
          background: 'rgba(0,0,0,0.2)',
          border: '1px solid rgba(255,255,255,0.3)',
          color: '#fff',
          padding: '0.25rem 0.75rem',
          borderRadius: '99px',
          cursor: 'pointer',
          fontSize: '0.75rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem',
          transition: 'all 200ms'
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.3)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.2)')}
      >
        {isPending ? 'Exiting...' : (
          <>
            Exit & Return to HQ
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>logout</span>
          </>
        )}
      </button>
    </div>
  )
}
