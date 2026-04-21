'use client'

import React, { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), [])

  if (!mounted) return (
    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--bg-raised)' }} />
  )

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        background: 'var(--bg-raised)',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: 'var(--text-primary)',
        transition: 'all 200ms ease'
      }}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
        {isDark ? 'light_mode' : 'dark_mode'}
      </span>
    </button>
  )
}
