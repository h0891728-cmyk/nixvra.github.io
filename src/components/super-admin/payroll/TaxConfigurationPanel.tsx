'use client'

import React, { useState } from 'react'

type Props = {
  activeTaxes: { taxType: string; rate: number; isActive: boolean }[]
  onUpdate: (type: string, rate: number, isActive: boolean) => Promise<void>
}

export default function TaxConfigurationPanel({ activeTaxes, onUpdate }: Props) {
  const [taxes, setTaxes] = useState(activeTaxes)
  const [loading, setLoading] = useState<string | null>(null)

  async function handleToggle(t: { taxType: string; rate: number; isActive: boolean }) {
    setLoading(t.taxType)
    await onUpdate(t.taxType, t.rate, !t.isActive)
    setTaxes(prev => prev.map(x => x.taxType === t.taxType ? { ...x, isActive: !x.isActive } : x))
    setLoading(null)
  }

  async function handleRateChange(taxType: string, newRate: number) {
    const t = taxes.find(x => x.taxType === taxType)
    if (!t) return
    setLoading(taxType)
    await onUpdate(t.taxType, newRate, t.isActive)
    setTaxes(prev => prev.map(x => x.taxType === taxType ? { ...x, rate: newRate } : x))
    setLoading(null)
  }

  return (
    <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 16, border: '1px solid var(--border)' }}>
      <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem' }}>Global Taxation Configuration</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        Compliance rules mapped to local government legislation. Turn specific taxes on or off.
      </p>

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
        {['TDS', 'PF', 'GST', 'PT'].map(type => {
          const cfg = taxes.find(x => x.taxType === type) || { taxType: type, rate: type === 'GST' ? 18 : 10, isActive: false }
          return (
            <div key={type} style={{ background: 'var(--bg-raised)', padding: '1.25rem', borderRadius: 12, border: `1px solid ${cfg.isActive ? 'rgba(0,176,119,0.4)' : 'var(--border)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{type}</span>
                <button 
                  onClick={() => handleToggle(cfg)} 
                  disabled={loading === type}
                  className="btn"
                  style={{
                    padding: '0.2rem 0.5rem', fontSize: '0.75rem',
                    background: cfg.isActive ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
                    color: cfg.isActive ? '#10b981' : '#f43f5e',
                    border: 'none', borderRadius: 6
                  }}>
                  {cfg.isActive ? 'Active' : 'Disabled'}
                </button>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tax Rate (%)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  value={cfg.rate} 
                  onChange={e => {
                    const newRate = parseFloat(e.target.value)
                    if (!isNaN(newRate)) {
                      setTaxes(prev => prev.map(x => x.taxType === type ? { ...x, rate: newRate } : x))
                    }
                  }}
                  onBlur={e => handleRateChange(type, parseFloat(e.target.value))}
                  className="form-input" 
                  style={{ marginTop: '0.25rem' }} 
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
