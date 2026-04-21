'use client'

import type { PublicTenantData } from '@/actions/public-ingestion'
import LeadCaptureForm from './LeadCaptureForm'

export default function ClinicTemplate({ tenant }: { tenant: PublicTenantData }) {
  const primary = tenant.primaryColor
  const doctors = tenant.highlights.filter(h => h.type === 'STAFF')
  const heroTitle = tenant.landingPage?.heroTitle ?? tenant.tagline ?? `Expert Care at ${tenant.name}`
  const heroSubtitle =
    tenant.landingPage?.heroSubtitle ??
    'Compassionate healthcare professionals dedicated to your well-being. Book a consultation today.'
  const customContent = (tenant.landingPage?.customContent ?? '').trim()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Nav ── */}
      <nav style={{
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(10,10,15,0.92)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {tenant.logoUrl ? (
            <img src={tenant.logoUrl} alt={tenant.name} style={{ height: 36, borderRadius: 8 }} />
          ) : (
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: primary, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.25rem', fontWeight: 900, color: '#fff',
            }}>
              {tenant.name[0]}
            </div>
          )}
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{tenant.name}</span>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', fontSize: '0.9rem' }}>
          {['About', 'Doctors', 'Services', 'Contact'].map(l => (
            <a key={l} href={`#${l.toLowerCase()}`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 600, transition: 'color 200ms' }}
              onMouseEnter={e => (e.currentTarget.style.color = primary)}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >{l}</a>
          ))}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        padding: '6rem 2rem 5rem',
        textAlign: 'center',
        background: `radial-gradient(ellipse at 50% 0%, ${primary}22 0%, transparent 65%)`,
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '0.375rem 0.875rem',
          borderRadius: 50,
          background: `${primary}18`,
          border: `1px solid ${primary}40`,
          marginBottom: '1.25rem',
          fontSize: '0.8125rem',
          fontWeight: 700,
          color: primary,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>emergency</span>
          Healthcare Excellence
        </div>
        <h1 style={{
          fontSize: 'clamp(2.5rem, 6vw, 4rem)',
          fontWeight: 900,
          lineHeight: 1.1,
          marginBottom: '1.25rem',
          background: `linear-gradient(135deg, var(--text-primary) 60%, ${primary})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          {heroTitle}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem', maxWidth: 560, margin: '0 auto 2rem' }}>
          {heroSubtitle}
        </p>
        <a href="#contact" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
          Book Appointment →
        </a>
      </section>

      <section id="about" style={{ padding: '4rem 2rem', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.75rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
            About
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
            {customContent || `Welcome to ${tenant.name}. Our team focuses on quality care, safety, and a patient-first experience.`}
          </p>
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          display: 'flex',
          gap: '1.5rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '1.5rem 2rem',
        }}>
          {[
            { icon: 'person', label: 'Specialist Doctors', value: doctors.length > 0 ? `${doctors.length}+` : '10+' },
            { icon: 'schedule', label: 'Experience', value: '15+ Yrs' },
            { icon: 'star', label: 'Patient Rating', value: '4.9 ★' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center', padding: '0 1.5rem' }}>
              <span className="material-symbols-outlined" style={{ color: primary, fontSize: '1.5rem', display: 'block' }}>{s.icon}</span>
              <p style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)' }}>{s.value}</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Doctors ── */}
      {doctors.length > 0 && (
        <section id="doctors" style={{ padding: '4rem 2rem', maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '2rem', textAlign: 'center', color: 'var(--text-primary)' }}>
            Our Specialists
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '1rem',
          }}>
            {doctors.map(d => (
              <div key={d.id} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '1.5rem',
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
                  width: 56, height: 56, borderRadius: 14,
                  background: `${primary}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '1rem',
                }}>
                  <span className="material-symbols-outlined" style={{ color: primary, fontSize: '1.75rem' }}>stethoscope</span>
                </div>
                <h3 style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 4 }}>{d.name}</h3>
                {d.coreTrait && <p style={{ fontSize: '0.8125rem', color: primary, fontWeight: 700 }}>{d.coreTrait}</p>}
                {d.description && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>{d.description}</p>}
                {d.coreValue && (
                  <p style={{ fontSize: '0.8rem', color: '#10b981', marginTop: 8, fontWeight: 700 }}>
                    Consultation: ₹{Number(d.coreValue).toLocaleString('en-IN')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Services ── */}
      <section id="services" style={{ padding: '4rem 2rem', background: 'var(--bg-card)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '2rem', textAlign: 'center' }}>Our Services</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {[
              { icon: 'emergency', label: 'Emergency Care' },
              { icon: 'cardiology', label: 'Cardiology' },
              { icon: 'pediatrics', label: 'Pediatrics' },
              { icon: 'radiology', label: 'Radiology' },
              { icon: 'orthopedics', label: 'Orthopedics' },
              { icon: 'psychology', label: 'Mental Health' },
            ].map(s => (
              <div key={s.label} style={{
                padding: '1.25rem',
                background: 'var(--bg-raised)',
                borderRadius: 14,
                border: '1px solid var(--border)',
                textAlign: 'center',
              }}>
                <span className="material-symbols-outlined" style={{ color: primary, fontSize: '1.75rem', display: 'block', marginBottom: 8 }}>{s.icon}</span>
                <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact + Lead Form ── */}
      <section id="contact" style={{ padding: '5rem 2rem', maxWidth: 700, margin: '0 auto' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.75rem', textAlign: 'center' }}>Book an Appointment</h2>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '2rem' }}>
          Fill in your details and our team will confirm your slot within 24 hours.
        </p>
        <LeadCaptureForm
          subdomain={tenant.subdomain}
          cta="Request Appointment"
          entityTypes={['General Consultation', 'Specialist Visit', 'Emergency', 'Follow-up']}
        />
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          © {new Date().getFullYear()} {tenant.name} — Powered by <strong style={{ color: primary }}>Nixvra</strong>
        </p>
      </footer>
    </div>
  )
}
