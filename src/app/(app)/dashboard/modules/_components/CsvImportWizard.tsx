import React, { useState, useRef } from 'react'
import Papa from 'papaparse'
import { importRecordsBulkAction, getImportTemplateAction } from '@/actions/tenant-records'

type Props = {
  onCheckList: () => void
  activeTabs: { label: string; value: string }[]
}

type ParsedRow = { [key: string]: string }
type Mapping = {
  name: string
  contact: string
  type: string
  coreTrait: string
  coreValue: string
  description: string
}

export default function CsvImportWizard({ onCheckList, activeTabs }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [file, setFile] = useState<File | null>(null)
  
  // Papa parsed data
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<ParsedRow[]>([])
  
  // Mapping configuration
  const [mapping, setMapping] = useState<Mapping>({
    name: '', contact: '', type: '', coreTrait: '', coreValue: '', description: ''
  })
  // Hardcoded default fallback type for all rows if not specified in CSV
  const [defaultType, setDefaultType] = useState<string>('CUSTOMER')

  const [isImporting, setIsImporting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [importResult, setImportResult] = useState<{ count?: number, failedCount?: number, errors?: any[], error?: string } | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)

  async function handleDownloadTemplate() {
    setIsDownloading(true)
    try {
      const { headers, rows, filename } = await getImportTemplateAction()
      const csvRows = [headers, ...(rows || [])]
      const csvContent = csvRows
        .map((row: string[]) => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Failed to generate template')
    }
    setIsDownloading(false)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      const f = e.target.files[0]
      setFile(f)

      Papa.parse(f, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.meta.fields) {
            setHeaders(results.meta.fields)
            
            // Auto mapping heuristics
            const autoMap: typeof mapping = { ...mapping }
            const search = (words: string[]) => results.meta.fields?.find(f => words.some(w => f.toLowerCase().includes(w))) || ''
            autoMap.name = search(['name', 'first', 'title'])
            autoMap.contact = search(['email', 'phone', 'contact'])
            autoMap.type = search(['type', 'role', 'category'])
            autoMap.coreValue = search(['price', 'salary', 'fee', 'value', 'amount'])
            
            setMapping(autoMap)
          }
          setRawRows(results.data as ParsedRow[])
          setStep(2)
        },
        error: (err) => {
          alert('Error parsing CSV: ' + err.message)
        }
      })
    }
  }

  async function handleImportExecute() {
    setIsImporting(true)
    
    // Transform rows according to mapping
    const payload = rawRows.map(r => ({
      name: mapping.name ? r[mapping.name] : null, // send null if not mapped to trigger server error for missing name
      contact: mapping.contact ? r[mapping.contact] : null,
      type: mapping.type && r[mapping.type] ? r[mapping.type].toUpperCase().trim() : defaultType,
      coreTrait: mapping.coreTrait ? r[mapping.coreTrait] : null,
      coreValue: mapping.coreValue ? r[mapping.coreValue] : null,
      description: mapping.description ? r[mapping.description] : null,
    }))

    try {
      const res = await importRecordsBulkAction(payload)
      setImportResult({ 
        count: res.count, 
        failedCount: res.failedCount, 
        errors: res.errors || undefined 
      })
      setStep(3)
    } catch (e: any) {
      setImportResult({ error: e.message || 'Unknown processing error' })
      setStep(3)
    }
    
    setIsImporting(false)
  }

  return (
    <div style={{ background: 'var(--bg-surface)', padding: '2rem', borderRadius: 16, border: '1px solid var(--border)' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ color: '#ec4899' }}>upload_file</span>
            Data Import Engine
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {step === 1 ? 'Upload a CSV to batch import into your isolated workspace.' : step === 2 ? 'Map your document columns to Nixvra properties.' : 'Import complete.'}
          </p>
        </div>
        <button onClick={onCheckList} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
          Cancel
        </button>
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div 
          onClick={() => fileRef.current?.click()}
          style={{
            border: '2px dashed var(--border)', borderRadius: 16, padding: '4rem 2rem',
            textAlign: 'center', cursor: 'pointer', background: 'var(--bg-raised)', transition: 'all 200ms'
          }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
             e.preventDefault()
             if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                fileRef.current!.files = e.dataTransfer.files
                const event = new Event('change', { bubbles: true })
                fileRef.current!.dispatchEvent(event)
             }
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: '#008E60', marginBottom: 12 }}>csv</span>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.25rem' }}>Click to upload or drag CSV</h3>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '1rem' }}>File must contain column headers. Up to 5000 rows max.</p>
          
          <button 
            disabled={isDownloading}
            onClick={e => {
              e.stopPropagation();
              handleDownloadTemplate();
            }} 
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--brand-500)', padding: '0.5rem 1rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.8125rem' }}
          >
            {isDownloading ? 'Generating...' : 'Download Example CSV'}
          </button>
          
          <input type="file" accept=".csv" ref={fileRef} onChange={handleFileChange} style={{ display: 'none' }} />
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', background: 'rgba(0,142,96,0.1)', padding: '1rem', borderRadius: 8, border: '1px solid rgba(0,142,96,0.2)' }}>
              <span className="material-symbols-outlined" style={{ color: '#008E60' }}>dataset</span>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: '#008E60' }}>Data Loaded Config: {file?.name}</p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Found {rawRows.length} rows and {headers.length} columns.</p>
              </div>
           </div>

           <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 250px', gap: '2rem' }}>
             {/* LEFT: MAPPING */}
             <div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 800, margin: '0 0 1rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Field Mapping</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {Object.keys(mapping).map((key) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-raised)', borderRadius: 8, border: '1px solid var(--border)' }}>
                       <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', width: 150 }}>
                         {key === 'name' ? 'Profile Name (*)' : 
                          key === 'type' ? 'Profile Type (Enum)' :
                          key === 'contact' ? 'Contact / Email' :
                          key === 'coreTrait' ? 'Core Sub-Trait' :
                          key === 'coreValue' ? 'Core Value Base' : 'Description'}
                       </span>
                       <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)' }}>arrow_right_alt</span>
                       <select 
                         className="form-input"
                         style={{ width: 250 }}
                         value={(mapping as any)[key]}
                         onChange={e => setMapping({ ...mapping, [key]: e.target.value })}
                       >
                          <option value="">-- Do not map --</option>
                          {headers.map(h => <option key={h} value={h}>{h}</option>)}
                       </select>
                    </div>
                  ))}
                </div>
             </div>

             {/* RIGHT: SETTINGS */}
             <div>
               <h4 style={{ fontSize: '0.875rem', fontWeight: 800, margin: '0 0 1rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Fallback Settings</h4>
               <div style={{ background: 'var(--bg-raised)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)' }}>
                 <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Default Type (if empty)</label>
                 <select 
                   value={defaultType} 
                   onChange={e => setDefaultType(e.target.value)}
                   className="form-input" style={{ marginTop: 6, width: '100%' }}
                 >
                    {activeTabs.map(t => <option key={t.value} value={t.value}>{t.value} ({t.label})</option>)}
                 </select>
                 <p style={{ marginTop: 8, fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                   If you don't map the "Type" column, or if a row has a blank type, they will default to this classification.
                 </p>
               </div>

               <button 
                  onClick={handleImportExecute}
                  disabled={isImporting || !mapping.name}
                  style={{ width: '100%', marginTop: '1.5rem', background: isImporting ? 'var(--text-muted)' : '#10b981', color: '#fff', padding: '0.75rem', border: 'none', borderRadius: 8, fontWeight: 700, cursor: isImporting ? 'not-allowed' : 'pointer', transition: 'all 200ms' }}
                >
                  {isImporting ? '⏳ Importing...' : `Run Import (${rawRows.length} rows) ⚡`}
               </button>
             </div>
           </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && importResult && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          {importResult.error ? (
             <>
               <span className="material-symbols-outlined" style={{ fontSize: '4rem', color: '#f43f5e', marginBottom: 16 }}>error</span>
               <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Import Failed</h3>
               <p style={{ color: 'var(--text-muted)' }}>There was an error during the master transaction.</p>
               <pre style={{ background: 'var(--bg-raised)', padding: '1rem', borderRadius: 8, color: '#f43f5e', fontSize: '0.75rem', marginTop: 16, overflowX: 'auto', textAlign: 'left' }}>
                 {importResult.error}
               </pre>
               <button onClick={() => setStep(1)} className="btn" style={{ marginTop: 24 }}>Try Again</button>
             </>
          ) : (
             <>
               <span className="material-symbols-outlined" style={{ fontSize: '4rem', color: '#10b981', marginBottom: 16 }}>check_circle</span>
               <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Transaction Complete</h3>
               <p style={{ color: 'var(--text-muted)' }}>Successfully imported <strong>{importResult.count}</strong> profiles.</p>
               
               {importResult.failedCount ? (
                 <div style={{ marginTop: '1.5rem', background: 'rgba(244,63,94,0.05)', border: '1px solid rgba(244,63,94,0.1)', borderRadius: 12, padding: '1rem', textAlign: 'left' }}>
                    <p style={{ margin: '0 0 1rem', fontWeight: 700, color: '#f43f5e', fontSize: '0.875rem' }}>
                      ⚠️ {importResult.failedCount} rows were skipped due to validation errors.
                    </p>
                    <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                       {importResult.errors?.map((err: any, i: number) => (
                         <div key={i} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', padding: '0.5rem 0' }}>
                            Line {err.index + 1}: <span style={{ color: '#f43f5e' }}>{err.error}</span> ({err.data.name || 'Unknown'})
                         </div>
                       ))}
                    </div>
                 </div>
               ) : null}

               <button onClick={onCheckList} className="btn btn-primary" style={{ marginTop: 24 }}>Return to Profile List</button>
             </>
          )}
        </div>
      )}

    </div>
  )
}
