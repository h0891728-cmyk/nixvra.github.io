'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const FEATURES = [
  { icon: '🏢', title: 'Multi-Tenant CRM', desc: 'Manage unlimited clients from one control plane. Each tenant gets fully isolated data.' },
  { icon: '📣', title: 'Ad Campaign Engine', desc: 'Create and track Meta & Google campaigns. Real-time performance metrics at a glance.' },
  { icon: '🔌', title: 'Universal Integration Hub', desc: 'Connect WhatsApp, Meta, Razorpay, Stripe, and 50+ APIs without writing a line of code.' },
  { icon: '⚡', title: 'Webhook Automation', desc: 'Process incoming webhooks in real-time. Route, transform, and trigger workflows automatically.' },
  { icon: '💳', title: 'Billing & Invoicing', desc: 'Generate GST-compliant invoices. Accept payments via Razorpay or Stripe with one click.' },
  { icon: '📊', title: 'Real-Time Analytics', desc: 'Unified dashboard for revenue, leads, and campaign ROI. Export to CSV or PDF anytime.' },
]

const INDUSTRIES = [
  { name: 'Education', emoji: '🎓', color: '#00B077' },
  { name: 'Healthcare', emoji: '🏥', color: '#059669' },
  { name: 'Real Estate', emoji: '🏠', color: '#f59e0b' },
  { name: 'E-Commerce', emoji: '🛒', color: '#06b6d4' },
  { name: 'Agency', emoji: '🚀', color: '#00B077' },
  { name: 'Finance', emoji: '💰', color: '#22c55e' },
]

const STATS = [
  { value: '500+', label: 'Tenants Managed' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '50+', label: 'Integrations' },
  { value: '10x', label: 'Faster Operations' },
]

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', background: '#FFFFFF', color: '#111', overflowX: 'hidden' }}>

      {/* ── NAVBAR ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 1.5rem',
        height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(255,255,255,0.97)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid #e5e7eb' : 'none',
        transition: 'all 300ms',
      }}>
        <img src="/logo.svg" alt="Nixvra" style={{ height: 32 }} />

        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          {['Features', 'Industries', 'Pricing'].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`} style={{
              color: '#555', textDecoration: 'none',
              fontSize: '0.9375rem', fontWeight: 500,
              transition: 'color 200ms',
            }}>{item}</a>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/login" style={{
            padding: '0.5rem 1.25rem', borderRadius: 8,
            border: '1px solid #e5e7eb',
            color: '#111', textDecoration: 'none',
            fontSize: '0.875rem', fontWeight: 600,
          }}>Log in</Link>
          <Link href="/login" style={{
            padding: '0.5rem 1.25rem', borderRadius: 8,
            background: '#00B077',
            color: '#fff', textDecoration: 'none',
            fontSize: '0.875rem', fontWeight: 600,
            boxShadow: '0 2px 12px rgba(0,176,119,0.35)',
          }}>Get started →</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '8rem 1.5rem 5rem', textAlign: 'center',
        position: 'relative', background: '#FFFFFF',
      }}>
        <div style={{
          position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,176,119,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.375rem 1rem', borderRadius: 999,
          border: '1px solid rgba(0,176,119,0.3)',
          background: 'rgba(0,176,119,0.06)',
          fontSize: '0.8125rem', fontWeight: 600, color: '#00B077',
          marginBottom: '1.75rem',
        }}>
          🚀 The All-in-One SaaS Platform for Modern Businesses
        </div>

        <h1 style={{
          fontSize: 'clamp(2.5rem, 7vw, 4.5rem)', fontWeight: 900,
          letterSpacing: '-0.04em', lineHeight: 1.05,
          margin: '0 auto 1.5rem', maxWidth: 900, color: '#111',
        }}>
          Run Your Entire{' '}
          <span style={{
            background: 'linear-gradient(135deg, #00B077, #059669)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Business</span>{' '}
          From One Platform
        </h1>

        <p style={{
          fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', color: '#555',
          maxWidth: 680, margin: '0 auto 2.5rem', lineHeight: 1.7,
        }}>
          CRM · Ad Campaigns · WhatsApp Automation · Invoicing · Webhooks · Analytics.
          Built for scale. Powered by TiDB. Trusted by 500+ businesses.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/login" style={{
            padding: '0.875rem 2rem', borderRadius: 10,
            background: '#00B077',
            color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '1rem',
            boxShadow: '0 4px 24px rgba(0,176,119,0.35)',
          }}>Start for free →</Link>
          <a href="#features" style={{
            padding: '0.875rem 2rem', borderRadius: 10,
            border: '1px solid #e5e7eb',
            color: '#111', textDecoration: 'none', fontWeight: 600, fontSize: '1rem',
          }}>See how it works</a>
        </div>

        {/* Stats bar */}
        <div style={{ marginTop: '5rem', display: 'flex', gap: '3rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {STATS.map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '2.25rem', fontWeight: 900, margin: 0, letterSpacing: '-0.04em', color: '#00B077' }}>{s.value}</p>
              <p style={{ fontSize: '0.875rem', color: '#888', margin: 0 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding: '6rem 1.5rem', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <span style={{
            display: 'inline-block', padding: '0.25rem 0.875rem', borderRadius: 999,
            background: 'rgba(0,176,119,0.08)', border: '1px solid rgba(0,176,119,0.2)',
            fontSize: '0.8125rem', fontWeight: 600, color: '#00B077', marginBottom: '1rem',
          }}>Core Features</span>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: 0, color: '#111' }}>
            Everything your business needs
          </h2>
          <p style={{ fontSize: '1.0625rem', color: '#666', marginTop: '0.75rem' }}>
            No more juggling 10 different tools. Nixvra is the one platform that does it all.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{
              padding: '1.75rem', borderRadius: 16,
              background: '#fff', border: '1px solid #e5e7eb',
              transition: 'all 250ms', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <div style={{
                fontSize: '2rem', marginBottom: '1rem',
                width: 52, height: 52, borderRadius: 12,
                background: 'rgba(0,176,119,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{f.icon}</div>
              <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#111', margin: '0 0 0.5rem' }}>{f.title}</h3>
              <p style={{ fontSize: '0.9375rem', color: '#666', margin: 0, lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── INDUSTRIES ── */}
      <section id="industries" style={{ padding: '5rem 1.5rem', background: '#f9fafb' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, letterSpacing: '-0.03em', color: '#111' }}>
              Built for every industry
            </h2>
            <p style={{ color: '#666', fontSize: '1.0625rem', marginTop: 8 }}>
              One platform, multiple industries. Customized experience for each tenant.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {INDUSTRIES.map((ind) => (
              <div key={ind.name} style={{
                padding: '1.5rem 2rem', borderRadius: 12, textAlign: 'center',
                background: '#fff', border: '1px solid #e5e7eb', minWidth: 140,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}>
                <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>{ind.emoji}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: ind.color }}>{ind.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ── */}
      <section style={{
        padding: '6rem 1.5rem', textAlign: 'center', background: '#fff',
      }}>
        <div style={{
          maxWidth: 680, margin: '0 auto', padding: '4rem 2rem',
          borderRadius: 24, border: '1px solid rgba(0,176,119,0.2)',
          background: 'rgba(0,176,119,0.03)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(circle at 50% 0%, rgba(0,176,119,0.08), transparent 60%)',
            pointerEvents: 'none',
          }} />
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '1rem', color: '#111' }}>
            Ready to scale your business?
          </h2>
          <p style={{ fontSize: '1.0625rem', color: '#666', marginBottom: '2rem' }}>
            Join 500+ businesses using Nixvra to manage clients, campaigns, and revenue.
          </p>
          <Link href="/login" style={{
            display: 'inline-block', padding: '0.875rem 2.5rem', borderRadius: 10,
            background: '#00B077',
            color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '1.0625rem',
            boxShadow: '0 4px 24px rgba(0,176,119,0.35)',
          }}>Get started for free →</Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        padding: '2rem 1.5rem', textAlign: 'center',
        borderTop: '1px solid #e5e7eb',
        color: '#999', fontSize: '0.875rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
          <img src="/logo.svg" alt="Nixvra" style={{ height: 20 }} />
        </div>
        © {new Date().getFullYear()} nixvra.online — All rights reserved.
      </footer>
    </div>
  )
}
