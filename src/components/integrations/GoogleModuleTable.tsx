"use client";


type TenantIntegrationStatus = {
  tenantId: string;
  tenantName: string;
  isConnected: boolean;
  connectedEmail: string | null;
  lastSync: string | null;
};

interface GoogleModuleTableProps {
  tenants: TenantIntegrationStatus[];
}

export function GoogleModuleTable({ tenants }: GoogleModuleTableProps) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-raised)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>domain</span>
            Tenant Google Environments
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
            Monitor the status of Google Workspace bindings across all isolated tenants.
          </p>
        </div>
      </div>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 700 }}>Tenant</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 700 }}>Google Module Status</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 700 }}>Bound Account</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 700 }}>Last Sync</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant, index) => (
              <tr key={tenant.tenantId} style={{ borderTop: '1px solid var(--border)', background: index % 2 === 0 ? 'transparent' : 'var(--bg-raised)' }}>
                <td style={{ padding: '1rem 1.5rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{tenant.tenantName}</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{tenant.tenantId}</div>
                </td>
                
                <td style={{ padding: '1rem 1.5rem' }}>
                  {tenant.isConnected ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '0.2rem 0.6rem', borderRadius: 999, background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: '0.6875rem', fontWeight: 700 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>check_circle</span>
                      CONNECTED
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '0.2rem 0.6rem', borderRadius: 999, background: 'rgba(244,63,94,0.1)', color: '#f43f5e', fontSize: '0.6875rem', fontWeight: 700 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>error</span>
                      PENDING
                    </span>
                  )}
                </td>
                
                <td style={{ padding: '1rem 1.5rem' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: tenant.connectedEmail ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: tenant.connectedEmail ? 'normal' : 'italic' }}>
                    {tenant.connectedEmail || 'No binding'}
                  </div>
                </td>

                <td style={{ padding: '1rem 1.5rem' }}>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    {tenant.lastSync || "-"}
                  </div>
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '2rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  No tenants found in the master database.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
