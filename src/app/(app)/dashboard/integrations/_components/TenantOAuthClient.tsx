'use client'

import { useState, useTransition } from 'react'
import { MegaphoneIcon, MessageCircleIcon, CreditCardIcon, ZapIcon } from '@/components/icons'

interface AppConfig {
  id: string;
  provider: string;
  name: string;
  desc: string;
  color: string;
}

const ICON_MAP: Record<string, any> = {
  META_GRAPH: MegaphoneIcon,
  WHATSAPP_CLOUD: MessageCircleIcon,
  STRIPE: CreditCardIcon,
}

export default function TenantOAuthClient({ 
  app, 
  isActive, 
  tenantDb 
}: { 
  app: AppConfig; 
  isActive: boolean;
  tenantDb: string;
}) {
  const [isHovered, setIsHovered] = useState(false)
  const [isPending, startTransition] = useTransition()

  const IconComp = ICON_MAP[app.provider] || ZapIcon

  // Function to navigate to the global OAuth initator route
  function handleConnect() {
    window.location.href = `/api/integrations/oauth/${app.id}`
  }

  // Optional: Function to Disconnect
  // To implement this, we'd add an action in `src/actions/tenant-integration.ts` and call it here.

  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: 'var(--bg-raised)', 
        border: `1px solid ${isActive ? 'var(--border)' : isHovered ? `${app.color}50` : 'var(--border)'}`,
        borderRadius: 16, overflow: 'hidden',
        transition: 'all 200ms',
        transform: isHovered && !isActive ? 'translateY(-2px)' : 'none',
        boxShadow: isHovered && !isActive ? `0 10px 25px ${app.color}15` : 'none',
      }}
    >
      <div style={{ padding: '1.25rem 1.25rem 1rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div style={{ 
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: `linear-gradient(135deg, ${app.color}20, ${app.color}40)`, 
          border: `1px solid ${app.color}50`, 
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: app.color 
        }}>
          <IconComp style={{ width: 22, height: 22 }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {app.name}
            </h4>
            {isActive && (
              <span style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem', borderRadius: 999, background: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: 700 }}>
                CONNECTED
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.375rem 0 0', lineHeight: 1.4 }}>
            {app.desc}
          </p>
        </div>
      </div>

      <div style={{ padding: '0 1.25rem 1.25rem', display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        {isActive ? (
          <>
            <button style={{ 
              flex: 1, padding: '0.5rem', borderRadius: 8, 
              background: 'var(--bg-overlay)', border: '1px solid var(--border)', 
              color: 'var(--text-primary)', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' 
            }}>
              Settings
            </button>
            <button style={{ 
              padding: '0.5rem 1rem', borderRadius: 8, 
              background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', 
              color: '#f43f5e', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' 
            }}>
              Disconnect
            </button>
          </>
        ) : (
          <button 
            onClick={handleConnect}
            style={{ 
              width: '100%', padding: '0.625rem', borderRadius: 8, 
              background: `linear-gradient(135deg, ${app.color}, ${app.color}dd)`, border: 'none', 
              color: '#fff', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer',
              boxShadow: `0 4px 10px ${app.color}40`, transition: 'all 200ms'
            }}
          >
            Connect to {app.name.split(' ')[0]}
          </button>
        )}
      </div>
    </div>
  )
}
