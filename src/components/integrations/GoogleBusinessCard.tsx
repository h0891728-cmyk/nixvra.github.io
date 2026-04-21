"use client";

import { signIn } from "next-auth/react";
interface GoogleBusinessCardProps {
  isConnected: boolean;
  connectedEmail?: string;
  targetTenantId?: string;
}

export function GoogleBusinessCard({ isConnected, connectedEmail, targetTenantId }: GoogleBusinessCardProps) {
  const handleConnect = () => {
    if (targetTenantId) {
      document.cookie = `google_target_tenant=${targetTenantId}; path=/; max-age=1800;`;
    }
    signIn("google", { callbackUrl: window.location.pathname });
  };

  const handleRevoke = async () => {
    console.log("Revoking Google access...");
    // Integration logic pointing to master DB
  };

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-raised)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'white', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <img src="https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png" alt="Google" style={{ width: 18, height: 18 }} />
            </div>
            Google Workspace & Business
            {isConnected ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '0.15rem 0.5rem', borderRadius: 999, background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: '0.6875rem', fontWeight: 700, marginLeft: '8px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                ACTIVE
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '0.15rem 0.5rem', borderRadius: 999, background: 'var(--bg-overlay)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontSize: '0.6875rem', fontWeight: 700, marginLeft: '8px' }}>
                DISCONNECTED
              </span>
            )}
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
            Link your Google account to automatically manage communications, media, and local footprint.
          </p>
        </div>
        
        <div>
          {isConnected ? (
            <button 
              onClick={handleRevoke}
              style={{ padding: '0.5rem 1rem', borderRadius: 8, background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: '#f43f5e', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Disconnect
            </button>
          ) : (
            <button 
              onClick={handleConnect}
              style={{ padding: '0.625rem 1.25rem', borderRadius: 8, background: '#00B077', border: 'none', color: '#fff', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0, 176, 119, 0.28)' }}
            >
              Connect Google Account
            </button>
          )}
        </div>
      </div>

      {/* Body / Features Breakdown */}
      <div style={{ padding: '1.5rem' }}>
        {isConnected && connectedEmail && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: 12, background: 'rgba(0, 176, 119, 0.08)', border: '1px solid rgba(0, 176, 119, 0.18)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="material-symbols-outlined" style={{ color: '#00B077', fontSize: '1.25rem' }}>check_circle</span>
            <div>
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Connected to {connectedEmail}
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Data synchronization is active. Your dashboard is now operating in unified mode.
              </p>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', marginBottom: '0.25rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>mail</span>
            </div>
            <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)' }}>Gmail Sync</h3>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Read and send emails directly through your CRM contacts.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f43f5e', marginBottom: '0.25rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>play_circle</span>
            </div>
            <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)' }}>YouTube Ads & Media</h3>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Manage video media uploads securely from your tenant panel.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(0, 176, 119, 0.1)', border: '1px solid rgba(0, 176, 119, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00B077', marginBottom: '0.25rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>storefront</span>
            </div>
            <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)' }}>GMB Management</h3>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Sync reviews, updates, and store locations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
