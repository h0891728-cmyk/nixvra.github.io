'use client'

import type { PublicTenantData } from '@/actions/public-ingestion'
import LeadCaptureForm from './LeadCaptureForm'

export default function GenericTemplate({ tenant }: { tenant: PublicTenantData }) {
  const primary = tenant.primaryColor
  const offerings = tenant.highlights
  const heroTitle = tenant.landingPage?.heroTitle ?? tenant.tagline ?? `Welcome to ${tenant.name}`
  const heroSubtitle =
    tenant.landingPage?.heroSubtitle ??
    'Professional services tailored to your needs. Reach out and let us build something great together.'
  const customContent = (tenant.landingPage?.customContent ?? '').trim()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Nav ── */}
      <nav style={{
        padding: '1rem 2rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {tenant.logoUrl ? (
            <img src={tenant.logoUrl} alt={tenant.name} style={{ height: 36, borderRadius: 8 }} />
          ) : (
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: primary, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.25rem', fontWeight: 900, color: '#fff',
            }}>{tenant.name[0]}</div>
          )}
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{tenant.name}</span>
        </div>
        <a href="#contact" className="btn-primary" style={{ textDecoration: 'none', fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
          Get in Touch
        </a>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        padding: '7rem 2rem 6rem', textAlign: 'center',
        background: `radial-gradient(ellipse at 50% 0%, ${primary}22 0%, transparent 65%)`,
      }}>
        <h1 style={{
          fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: '1.25rem',
          background: `linear-gradient(135deg, var(--text-primary) 60%, ${primary})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          {heroTitle}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem', maxWidth: 560, margin: '0 auto 2.5rem' }}>
          {heroSubtitle}
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="#services" className="btn-primary" style={{ textDecoration: 'none' }}>Our Services →</a>
          <a href="#contact" style={{
            padding: '0.75rem 1.5rem', borderRadius: 10,
            border: '1.5px solid var(--border)',
            color: 'var(--text-secondary)', fontWeight: 700,
            fontSize: '0.9375rem', textDecoration: 'none',
            transition: 'border-color 200ms',
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = primary)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >Contact Us</a>
        </div>
      </section>

      {customContent && (
        <section style={{ padding: '3rem 2rem', maxWidth: 900, margin: '0 auto' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.75rem' }}>About</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
              {customContent}
            </p>
          </div>
        </section>
      )}

      {/* ── Offerings / Staff ── */}
      {offerings.length > 0 && (
        <section id="services" style={{ padding: '4rem 2rem', maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '2rem', textAlign: 'center' }}>
            What We Offer
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
            {offerings.map(o => (
              <div key={o.id} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 16, padding: '1.5rem',
                transition: 'border-color 200ms, transform 200ms',
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = primary
                  ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'
                  ;(e.currentTarget as HTMLDivElement).style.transform = 'none'
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: `${primary}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.875rem',
                }}>
                  <span className="material-symbols-outlined" style={{ color: primary, fontSize: '1.5rem' }}>star</span>
                </div>
                <h3 style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 4 }}>{o.name}</h3>
                {o.coreTrait && <p style={{ fontSize: '0.8125rem', color: primary, fontWeight: 700 }}>{o.coreTrait}</p>}
                {o.description && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>{o.description}</p>}
                {o.coreValue && (
                  <p style={{ fontSize: '1rem', fontWeight: 900, color: '#10b981', marginTop: 8 }}>
                    ₹{Number(o.coreValue).toLocaleString('en-IN')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Why Us ── */}
      <section style={{ padding: '4rem 2rem', background: 'var(--bg-card)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '2.5rem' }}>Why Choose Us</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            {[
              { icon: 'verified', title: 'Trusted & Verified', desc: 'Years of proven excellence in the field.' },
              { icon: 'speed', title: 'Fast Turnaround', desc: 'We deliver on time, every time.' },
              { icon: 'support_agent', title: '24/7 Support', desc: 'Always available when you need us.' },
              { icon: 'workspace_premium', title: 'Premium Quality', desc: 'Unmatched attention to detail.' },
            ].map(w => (
              <div key={w.title} style={{ padding: '1.5rem', background: 'var(--bg-raised)', borderRadius: 14 }}>
                <span className="material-symbols-outlined" style={{ color: primary, fontSize: '2rem', display: 'block', marginBottom: '0.75rem' }}>{w.icon}</span>
                <h3 style={{ fontWeight: 800, fontSize: '0.9375rem', marginBottom: 4 }}>{w.title}</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact Form ── */}
      <section id="contact" style={{ padding: '5rem 2rem', maxWidth: 620, margin: '0 auto' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.75rem', textAlign: 'center' }}>Get in Touch</h2>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '2rem' }}>
          We will respond within 24 hours. No commitment required.
        </p>
        <LeadCaptureForm subdomain={tenant.subdomain} cta="Send Message" />
      </section>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          © {new Date().getFullYear()} {tenant.name} — Powered by <strong style={{ color: primary }}>Nixvra</strong>
        </p>
      </footer>
    </div>
  )
}
