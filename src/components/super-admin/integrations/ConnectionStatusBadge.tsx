'use client'

import React from 'react'

type Props = {
  isActive: boolean
  hasCredentials: boolean
  className?: string
}

export default function ConnectionStatusBadge({ isActive, hasCredentials }: Props) {
  if (!hasCredentials) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontSize: '0.6875rem', fontWeight: 700, padding: '0.2rem 0.6rem',
        borderRadius: 999, letterSpacing: '0.03em',
        background: 'rgba(90,90,120,0.15)', color: '#9898b8',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#9898b8' }} />
        Not Connected
      </span>
    )
  }
  if (isActive) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontSize: '0.6875rem', fontWeight: 700, padding: '0.2rem 0.6rem',
        borderRadius: 999, letterSpacing: '0.03em',
        background: 'rgba(16,185,129,0.12)', color: '#10b981',
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%', background: '#10b981',
          boxShadow: '0 0 6px rgba(16,185,129,0.7)',
          animation: 'pulse 2s infinite',
        }} />
        Active
      </span>
    )
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: '0.6875rem', fontWeight: 700, padding: '0.2rem 0.6rem',
      borderRadius: 999, letterSpacing: '0.03em',
      background: 'rgba(245,158,11,0.12)', color: '#f59e0b',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />
      Inactive
    </span>
  )
}
