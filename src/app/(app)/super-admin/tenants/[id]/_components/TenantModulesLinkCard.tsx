'use client';

import React from 'react';

const MODULES_REGISTRY = [
  { id: 'CRM', icon: 'group' },
  { id: 'BILLING', icon: 'credit_card' },
  { id: 'ADS', icon: 'campaign' },
  { id: 'SOCIAL', icon: 'forum' },
  { id: 'WEBHOOKS', icon: 'power' },
  { id: 'SCHEDULING', icon: 'calendar_month' },
  { id: 'ANALYTICS', icon: 'analytics' },
  { id: 'AUDIT', icon: 'policy' },
];

export default function TenantModulesLinkCard({ modules }: { modules: string[] }) {
  const handleSwitchTab = () => {
    window.dispatchEvent(new CustomEvent('switch-tenant-tab', { detail: 'modules' }));
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.625rem' }}>
      {MODULES_REGISTRY.map(mod => {
        const active = modules.includes(mod.id);
        return (
          <div 
            key={mod.id} 
            onClick={handleSwitchTab}
            style={{
              padding: '0.75rem 0.5rem', borderRadius: 10, textAlign: 'center',
              background: active ? 'rgba(0,176,119,0.1)' : 'var(--bg-raised)',
              border: `1px solid ${active ? 'rgba(0,176,119,0.25)' : 'var(--border)'}`,
              transition: 'all 200ms',
              cursor: 'pointer',
            }}
            title="Click to test modules"
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span className="material-symbols-outlined" style={{ display: 'block', margin: '0 auto 0.25rem', color: active ? '#00B077' : 'var(--text-muted)' }}>
              {mod.icon}
            </span>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: active ? '#818cf8' : 'var(--text-muted)' }}>{mod.id}</span>
          </div>
        );
      })}
    </div>
  );
}
