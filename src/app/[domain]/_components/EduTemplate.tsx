'use client'

import type { PublicTenantData } from '@/actions/public-ingestion'
import LeadCaptureForm from './LeadCaptureForm'

export default function EduTemplate({ tenant }: { tenant: PublicTenantData }) {
  const primary = tenant.primaryColor
  const teachers = tenant.highlights.filter(h => h.type === 'TEACHER')
  const groups = tenant.highlights.filter(h => h.type === 'GROUP')
  const heroTitle = tenant.landingPage?.heroTitle ?? tenant.tagline ?? `Shape Your Future at ${tenant.name}`
  const heroSubtitle =
    tenant.landingPage?.heroSubtitle ??
    'World-class faculty, structured programs, and a nurturing environment — built for every learner.'
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
          {['About', 'Faculty', 'Programs', 'Admission'].map(l => (
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
          padding: '0.375rem 0.875rem', borderRadius: 50,
          background: `${primary}18`, border: `1px solid ${primary}40`,
          marginBottom: '1.25rem', fontSize: '0.8125rem', fontWeight: 700, color: primary,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>school</span>
          Excellence in Education
        </div>
        <h1 style={{
          fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: '1.25rem',
          background: `linear-gradient(135deg, var(--text-primary) 60%, ${primary})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          {heroTitle}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem', maxWidth: 580, margin: '0 auto 2rem' }}>
          {heroSubtitle}
        </p>
        <a href="#admission" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
          Apply for Admission →
        </a>
      </section>

      <section id="about" style={{ padding: '4rem 2rem', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.75rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
            About
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
            {customContent || `Welcome to ${tenant.name}. We focus on strong fundamentals, creative learning, and a safe environment for every student.`}
          </p>
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center',
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem 2rem',
        }}>
          {[
            { icon: 'menu_book', label: 'Programs', value: groups.length > 0 ? `${groups.length}` : '20+' },
            { icon: 'person', label: 'Expert Faculty', value: teachers.length > 0 ? `${teachers.length}+` : '50+' },
            { icon: 'workspace_premium', label: 'Years of Excellence', value: '15+' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center', padding: '0 1.5rem' }}>
              <span className="material-symbols-outlined" style={{ color: primary, fontSize: '1.5rem', display: 'block' }}>{s.icon}</span>
              <p style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)' }}>{s.value}</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Programs / Groups ── */}
      {groups.length > 0 && (
        <section id="programs" style={{ padding: '4rem 2rem', maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '2rem', textAlign: 'center' }}>Our Programs</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
            {groups.map(g => (
              <div key={g.id} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem',
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
                  <span className="material-symbols-outlined" style={{ color: primary, fontSize: '1.5rem' }}>class</span>
                </div>
                <h3 style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 4 }}>{g.name}</h3>
                {g.coreTrait && <p style={{ fontSize: '0.8125rem', color: primary, fontWeight: 700 }}>{g.coreTrait}</p>}
                {g.description && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>{g.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Faculty ── */}
      {teachers.length > 0 && (
        <section id="faculty" style={{ padding: '4rem 2rem', background: 'var(--bg-card)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '2rem', textAlign: 'center' }}>Our Faculty</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {teachers.map(t => (
                <div key={t.id} style={{
                  background: 'var(--bg-raised)', border: '1px solid var(--border)',
                  borderRadius: 14, padding: '1.25rem', textAlign: 'center',
                }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: `${primary}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 0.875rem',
                  }}>
                    <span className="material-symbols-outlined" style={{ color: primary, fontSize: '1.5rem' }}>person</span>
                  </div>
                  <h3 style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--text-primary)', marginBottom: 4 }}>{t.name}</h3>
                  {t.coreTrait && <p style={{ fontSize: '0.78rem', color: primary, fontWeight: 700 }}>{t.coreTrait}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Admission Form ── */}
      <section id="admission" style={{ padding: '5rem 2rem', maxWidth: 700, margin: '0 auto' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.75rem', textAlign: 'center' }}>Apply for Admission</h2>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '2rem' }}>
          Fill out this quick form and our admissions team will reach out within 48 hours.
        </p>
        <LeadCaptureForm
          subdomain={tenant.subdomain}
          cta="Start Application"
          entityTypes={groups.map(g => g.name).slice(0, 6).concat(['General Inquiry'])}
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
