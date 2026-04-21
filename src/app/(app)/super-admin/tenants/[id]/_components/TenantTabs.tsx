'use client';

import { useState, useEffect } from 'react';

export default function TenantTabs({
  overview,
  modules,
  domains,
  marketing,
  erp,
  integrations,
  branding,
  googleOps,
}: {
  overview: React.ReactNode;
  modules: React.ReactNode;
  domains: React.ReactNode;
  marketing: React.ReactNode;
  erp: React.ReactNode;
  integrations: React.ReactNode;
  branding: React.ReactNode;
  googleOps: React.ReactNode;
}) {
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const handle = (e: Event) => {
      const ce = e as CustomEvent;
      if (ce.detail) setActiveTab(ce.detail);
    };
    window.addEventListener('switch-tenant-tab', handle);
    return () => window.removeEventListener('switch-tenant-tab', handle);
  }, []);

  const tabs = [
    { id: 'overview',      label: 'Overview',        icon: 'dashboard' },
    { id: 'modules',       label: 'Modules Control', icon: 'view_module' },
    { id: 'domains',       label: 'Domains & Web',   icon: 'language' },
    { id: 'marketing',     label: 'Marketing Hub',   icon: 'campaign' },
    { id: 'erp',           label: 'Financial ERP',   icon: 'account_balance' },
    { id: 'integrations',  label: 'Integrations',    icon: 'extension' },
    { id: 'googleops',     label: 'Google Ops',      icon: 'google' },
    { id: 'branding',      label: 'Landing Page',    icon: 'web' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Tab Navigation */}
      <div
        className="hide-scrollbar"
        style={{
          display: 'flex',
          gap: '0.25rem',
          overflowX: 'auto',
          padding: '0.25rem',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
        }}
      >
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.75rem 1.25rem',
                background: isActive ? 'var(--bg-raised)' : 'transparent',
                border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                color: isActive ? '#00B077' : 'var(--text-muted)',
                fontWeight: isActive ? 700 : 600,
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                cursor: 'pointer', borderRadius: 12,
                transition: 'all 0.2s ease', whiteSpace: 'nowrap',
                boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                fontSize: '0.875rem',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
        {activeTab === 'overview'     && overview}
        {activeTab === 'modules'      && modules}
        {activeTab === 'domains'      && domains}
        {activeTab === 'marketing'    && marketing}
        {activeTab === 'erp'          && erp}
        {activeTab === 'integrations' && integrations}
        {activeTab === 'googleops'    && googleOps}
        {activeTab === 'branding'     && branding}
      </div>
    </div>
  );
}
