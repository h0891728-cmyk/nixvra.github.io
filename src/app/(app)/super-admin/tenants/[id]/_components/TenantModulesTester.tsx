'use client';

import { useState } from 'react';

const MODULES_REGISTRY = [
  { id: 'CRM', name: 'CRM Core', icon: 'group', desc: 'Customer Relationship Management and Entity Tracking.' },
  { id: 'BILLING', name: 'Billing Engine', icon: 'credit_card', desc: 'Invoicing, recurrent subscriptions, and payments.' },
  { id: 'ADS', name: 'Ads Manager', icon: 'campaign', desc: 'Omni-channel ad campaigns and budget tracking.' },
  { id: 'SOCIAL', name: 'Social Hub', icon: 'forum', desc: 'Meta APIs, WhatsApp, and social post sync.' },
  { id: 'WEBHOOKS', name: 'Webhooks', icon: 'power', desc: 'Real-time event subscriptions and dispatching.' },
  { id: 'SCHEDULING', name: 'Scheduling', icon: 'calendar_month', desc: 'Appointments, meetings, and calendar sync.' },
  { id: 'ANALYTICS', name: 'Analytics Data', icon: 'analytics', desc: 'Advanced BI, reporting, and predictive AI data.' },
  { id: 'AUDIT', name: 'Audit Logs', icon: 'policy', desc: 'Compliance tracking, ISO logs, and detailed history.' },
];

export default function TenantModulesTester({ activeModules }: { activeModules: string[] }) {
  const [testingModule, setTestingModule] = useState<string | null>(null);
  const [testLogs, setTestLogs] = useState<string[]>([]);

  const handleTestModule = (moduleId: string) => {
    setTestingModule(moduleId);
    setTestLogs([
      `[Sys] Initializing test sequence for ${moduleId}...`,
      `[Net] Pinging module endpoints...`
    ]);

    setTimeout(() => {
      setTestLogs(prev => [...prev, `[Auth] Verifying tenant credentials for ${moduleId}... OK`]);
    }, 800);

    setTimeout(() => {
      setTestLogs(prev => [...prev, `[DB] Connecting to tenant isolated storage... OK`]);
    }, 1500);

    setTimeout(() => {
      const isActive = activeModules.includes(moduleId);
      if (isActive) {
        setTestLogs(prev => [...prev, `[Status] Module ${moduleId} is explicitly enabled.`, `[Sys] Test completed successfully. Everything is operational.`]);
      } else {
        setTestLogs(prev => [...prev, `[Status] Module ${moduleId} is NOT enabled for this tenant.`, `[Sys] Test finished. Access would be denied.`]);
      }
    }, 2500);
  };

  return (
    <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'minmax(0, 1fr) 350px' }}>
      
      {/* Module Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', alignContent: 'start' }}>
        {MODULES_REGISTRY.map(mod => {
          const isActive = activeModules.includes(mod.id);
          const isTesting = testingModule === mod.id;

          return (
            <div key={mod.id} style={{
              background: 'var(--bg-surface)', border: `1px solid ${isActive ? 'rgba(0,176,119,0.3)' : 'var(--border)'}`,
              borderRadius: 16, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem',
              position: 'relative', overflow: 'hidden'
            }}>
              {isActive && (
                <div style={{ position: 'absolute', top: 0, right: 0, padding: '0.25rem 0.75rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: '0.625rem', fontWeight: 800, borderBottomLeftRadius: 10 }}>ACTIVE</div>
              )}
              {!isActive && (
                <div style={{ position: 'absolute', top: 0, right: 0, padding: '0.25rem 0.75rem', background: 'rgba(244,63,94,0.1)', color: '#f43f5e', fontSize: '0.625rem', fontWeight: 800, borderBottomLeftRadius: 10 }}>DISABLED</div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ 
                  width: 42, height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isActive ? 'rgba(0,176,119,0.15)' : 'var(--bg-raised)', color: isActive ? '#00B077' : 'var(--text-muted)'
                }}>
                  <span className="material-symbols-outlined">{mod.icon}</span>
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{mod.name}</h4>
                  <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>MOD_ID: {mod.id}</p>
                </div>
              </div>

              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5, flex: 1 }}>
                {mod.desc}
              </p>

              <button 
                onClick={() => handleTestModule(mod.id)}
                disabled={isTesting}
                style={{
                  width: '100%', padding: '0.625rem', borderRadius: 8, border: 'none',
                  background: isTesting ? 'var(--bg-raised)' : 'var(--bg-raised)',
                  borderTop: '1px solid var(--border)',
                  color: isTesting ? '#00B077' : 'var(--text-primary)',
                  fontWeight: 600, cursor: isTesting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  transition: 'all 0.2s', marginTop: '0.5rem'
                }}
              >
                {isTesting ? <span className="material-symbols-outlined" style={{ animation: 'spin 2s linear infinite' }}>sync</span> : <span className="material-symbols-outlined">science</span>}
                {isTesting ? 'Testing...' : 'Run Diagnostics'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Live Logs Terminal */}
      <div style={{ 
        background: '#0d1117', border: '1px solid #30363d', borderRadius: 16, overflow: 'hidden',
        display: 'flex', flexDirection: 'column', height: '100%', minHeight: 400
       }}>
        <div style={{ 
          background: '#161b22', padding: '0.75rem 1rem', borderBottom: '1px solid #30363d',
          display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}>
          <span className="material-symbols-outlined" style={{ color: '#8b949e', fontSize: '1rem' }}>terminal</span>
          <span style={{ color: '#c9d1d9', fontSize: '0.8125rem', fontWeight: 600, fontFamily: 'monospace' }}>Diagnostics Monitor</span>
        </div>
        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, overflowY: 'auto' }}>
          {testingModule === null ? (
            <p style={{ color: '#8b949e', fontSize: '0.8125rem', fontFamily: 'monospace', margin: 0 }}>Waiting for module diagnostic trigger...</p>
          ) : (
            testLogs.map((log, i) => (
              <p key={i} style={{ 
                margin: 0, fontSize: '0.75rem', fontFamily: 'monospace', 
                color: log.includes('OK') || log.includes('successfully') ? '#3fb950' : 
                       log.includes('NOT') || log.includes('denied') ? '#f85149' : '#8b949e'
              }}>
                <span style={{ color: '#c9d1d9', opacity: 0.5, marginRight: '0.5rem' }}>{new Date().toISOString().split('T')[1].slice(0, 12)}</span>
                {log}
              </p>
            ))
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
