'use client'

import { useState } from 'react'
import { MegaphoneIcon, MessageCircleIcon, CreditCardIcon, ZapIcon } from '@/components/icons'

const APP_CATALOG = [
  { 
    id: 'meta', 
    provider: 'META_GRAPH', 
    name: 'Meta Applications', 
    desc: 'Connect Instagram & Facebook Pages to manage campaigns and leads.',
    color: '#06b6d4',
  },
  { 
    id: 'whatsapp', 
    provider: 'WHATSAPP_CLOUD', 
    name: 'WhatsApp Business', 
    desc: 'Send automated alerts and chat natively with your customers.',
    color: '#10b981',
  },
  { 
    id: 'stripe', 
    provider: 'STRIPE', 
    name: 'Stripe Payments', 
    desc: 'Accept credit card payments globally with secure checkout.',
    color: '#00B077',
  },
  { 
    id: 'razorpay', 
    provider: 'RAZORPAY', 
    name: 'Razorpay Gateways', 
    desc: 'Process domestic INR transactions through standard banking methods.',
    color: '#3b82f6',
  },
  { 
    id: 'twilio', 
    provider: 'TWILIO', 
    name: 'Twilio SMS', 
    desc: 'Broadcast bulk SMS notifications seamlessly from the CRM.',
    color: '#f43f5e',
  },
  { 
    id: 'sendgrid', 
    provider: 'SENDGRID', 
    name: 'SendGrid Emails', 
    desc: 'Automate mass email broadcasts targeting your active client base.',
    color: '#0ea5e9',
  },
  { 
    id: 'canva', 
    provider: 'CANVA', 
    name: 'Canva Design Hub', 
    desc: 'Import ad-creatives instantly into your marketing composer.',
    color: '#008E60',
  }
]

const ICON_MAP: Record<string, any> = {
  META_GRAPH: MegaphoneIcon,
  WHATSAPP_CLOUD: MessageCircleIcon,
  STRIPE: CreditCardIcon,
  RAZORPAY: CreditCardIcon,
  TWILIO: MessageCircleIcon,
  SENDGRID: ZapIcon,
  CANVA: ZapIcon,
}

export default function TenantIntegrations({ 
  tenantId, 
  activeProviders 
}: { 
  tenantId: string;
  activeProviders: string[];
}) {
  return (
    <div style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
            App Integrations
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
            Connect third-party apps directly to this tenant database using OAuth.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {APP_CATALOG.map((app) => {
          const isActive = activeProviders.includes(app.provider)
          return <IntegrationCard key={app.id} app={app} isActive={isActive} tenantId={tenantId} />
        })}
      </div>
    </div>
  )
}

function IntegrationCard({ app, isActive, tenantId }: { app: any, isActive: boolean, tenantId: string }) {
  const [isHovered, setIsHovered] = useState(false)
  const IconComp = ICON_MAP[app.provider] || ZapIcon

  function handleConnect() {
    window.location.href = `/api/integrations/oauth/${app.id}?targetTenantId=${tenantId}&source=superadmin`
  }

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
              Configure
            </button>
            <button style={{ 
              padding: '0.5rem 1rem', borderRadius: 8, 
              background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', 
              color: '#f43f5e', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' 
            }}>
              Revoke
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
            Connect Setup
          </button>
        )}
      </div>
    </div>
  )
}
