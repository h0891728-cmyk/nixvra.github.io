'use client'

import React, { useState } from 'react'

type Props = {
  gateways: { provider: string; isActive: boolean; hasKey: boolean }[]
  onToggle: (provider: string, isActive: boolean) => Promise<void>
}

export default function PaymentGatewayManager({ gateways, onToggle }: Props) {
  const [items, setItems] = useState(gateways)
  const [loading, setLoading] = useState<string | null>(null)

  async function handle(provider: string, currentStatus: boolean) {
    setLoading(provider)
    await onToggle(provider, !currentStatus)
    setItems(prev => prev.map(x => x.provider === provider ? { ...x, isActive: !currentStatus } : x))
    setLoading(null)
  }

  return (
    <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 16, border: '1px solid var(--border)' }}>
      <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem' }}>Payment Gateways (Disbursement & Collections)</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        Manage Razorpay and Stripe API keys to allow one-click salary disbursement and invoice collections.
      </p>

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {['RAZORPAY', 'STRIPE'].map(provider => {
          const gw = items.find(x => x.provider === provider) || { provider, isActive: false, hasKey: false }
          
          return (
            <div key={provider} style={{
              background: 'var(--bg-raised)', padding: '1.25rem', borderRadius: 12, 
              border: `1px solid var(--border)`,
              display: 'flex', flexDirection: 'column', gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {provider === 'STRIPE' ? '💳' : '💸'} {provider}
                </span>
                <button 
                  onClick={() => handle(provider, gw.isActive)} 
                  disabled={loading === provider}
                  className="btn"
                  style={{
                    padding: '0.3rem 0.6rem', fontSize: '0.75rem',
                    background: gw.isActive ? '#10b981' : 'var(--bg-overlay)',
                    color: gw.isActive ? '#fff' : 'var(--text-muted)',
                    border: 'none', borderRadius: 6
                  }}>
                  {gw.isActive ? 'Active' : 'Disabled'}
                </button>
              </div>

              <div style={{ fontSize: '0.8125rem', color: gw.hasKey ? '#10b981' : '#f59e0b' }}>
                {gw.hasKey ? '✓ Credentials Configured' : '⚠ Missing API Secrets'}
              </div>

              {!gw.hasKey && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
                  Navigate to Master Integrations Panel to strictly map API secrets for {provider}.
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
