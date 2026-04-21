'use client';

import React, { useState } from 'react';

const ENTITY_TYPES = [
  'STUDENT', 'PATIENT', 'LEAD', 'AGENT', 'CUSTOMER', 
  'VENDOR', 'STAFF', 'TEACHER', 'PARENT', 'PROPERTY', 'GROUP', 'ASSET'
];

interface Props {
  onSuccess?: () => void;
  tenantId?: string;
  isGlobalAdmin?: boolean; // if creating from Super Admin panel
}

export default function PolymorphicEntityForm({ onSuccess, tenantId, isGlobalAdmin }: Props) {
  const [type, setType] = useState('LEAD');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [description, setDescription] = useState('');
  const [coreTrait, setCoreTrait] = useState('');
  const [coreValue, setCoreValue] = useState<number | ''>('');
  
  const [submitting, setSubmitting] = useState(false);

  // Dynamic placeholders based on type
  const typeConfig: Record<string, { traitLabel: string, valueLabel: string }> = {
    STUDENT: { traitLabel: 'Grade / Class', valueLabel: 'Roll Number / ID' },
    PATIENT: { traitLabel: 'Blood Group / Ailment', valueLabel: 'Patient ID' },
    LEAD: { traitLabel: 'Lead Source', valueLabel: 'Lead Score / Budgets' },
    AGENT: { traitLabel: 'Region / Territory', valueLabel: 'Commission Rate (%)' },
    CUSTOMER: { traitLabel: 'Primary Channel', valueLabel: 'Lifetime Value (LTV)' },
    VENDOR: { traitLabel: 'Service Category', valueLabel: 'Contract Value' },
    STAFF: { traitLabel: 'Department', valueLabel: 'Base Salary' },
    TEACHER: { traitLabel: 'Subject Specialization', valueLabel: 'Experience (Years)' },
    PROPERTY: { traitLabel: 'Address / Location', valueLabel: 'Area (SQFT)' },
    ASSET: { traitLabel: 'Asset Serial / Model', valueLabel: 'Depreciated Value' },
  };

  const currentConfig = typeConfig[type] || { traitLabel: 'Primary Attribute', valueLabel: 'Numeric Value' };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    
    // In a real app, this would dispatch to a server action
    try {
      console.log('Dispatching polymorphic payload:', {
        type, name, contact, description, coreTrait, coreValue, tenantId
      });
      // Mock network delay
      await new Promise(r => setTimeout(r, 600));
      alert(`Successfully created ${type} element.`);
      if(onSuccess) onSuccess();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 16, border: '1px solid var(--border)' }}>
      <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="material-symbols-outlined">shape_line</span>
        Polymorphic Entity Creator
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Entity Type</label>
          <select 
            value={type} onChange={e => setType(e.target.value)} required
            style={{ width: '100%', padding: '0.625rem', borderRadius: 8, background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          >
            {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        
        {isGlobalAdmin && (
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Target Tenant Network (ID)</label>
            <input 
              value={tenantId || ''} readOnly={!!tenantId} required placeholder="Target Tenant ID"
              style={{ width: '100%', padding: '0.625rem', borderRadius: 8, background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            />
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Full Name / Title</label>
          <input 
            value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. John Doe, Riverside Villa"
            style={{ width: '100%', padding: '0.625rem', borderRadius: 8, background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Contact Info</label>
          <input 
            value={contact} onChange={e => setContact(e.target.value)} placeholder="Email or Phone (Optional)"
            style={{ width: '100%', padding: '0.625rem', borderRadius: 8, background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Description / Notes</label>
        <textarea 
          value={description} onChange={e => setDescription(e.target.value)} placeholder="Additional context..." rows={2}
          style={{ width: '100%', padding: '0.625rem', borderRadius: 8, background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)', resize: 'none' }}
        />
      </div>

      {/* Polymorphic Adaptation Layer */}
      <div style={{ padding: '1rem', background: 'rgba(0,176,119,0.05)', borderRadius: 12, border: '1px solid rgba(0,176,119,0.15)', marginTop: '0.5rem' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#00B077', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>tune</span>
          Adaptive Metadata ({type})
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{currentConfig.traitLabel}</label>
            <input 
              value={coreTrait} onChange={e => setCoreTrait(e.target.value)} placeholder={`e.g. ${currentConfig.traitLabel}...`}
              style={{ width: '100%', padding: '0.625rem', borderRadius: 8, background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{currentConfig.valueLabel}</label>
            <input 
              type="number" step="0.01" value={coreValue} onChange={e => setCoreValue(e.target.value ? parseFloat(e.target.value) : '')} placeholder="Null"
              style={{ width: '100%', padding: '0.625rem', borderRadius: 8, background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
        <button 
          type="submit" disabled={submitting}
          style={{
            padding: '0.75rem 1.75rem', borderRadius: 8, border: 'none', background: '#00B077', color: '#fff',
            fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', transition: 'all 200ms',
            opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}
        >
          {submitting ? 'Processing...' : 'Create Polymorphic Entity'}
          {!submitting && <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_circle</span>}
        </button>
      </div>
    </form>
  );
}
