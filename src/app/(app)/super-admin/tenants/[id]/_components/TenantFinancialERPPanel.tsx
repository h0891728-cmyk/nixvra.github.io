import { getTenantDb, masterDb } from '@/lib/db'

export default async function TenantFinancialERPPanel({ tenantId }: { tenantId: string }) {
  const tenant = await masterDb.tenant.findUnique({
    where: { id: tenantId },
    select: { databaseName: true }
  })
  if (!tenant) return null

  let payrolls: any[] = []
  let invoices: any[] = []
  
  try {
    const db = await getTenantDb(tenant.databaseName)
    payrolls = await db.payrollRun.findMany({ orderBy: { createdAt: 'desc' }, take: 4 })
    invoices = await db.invoice.findMany({ orderBy: { createdAt: 'desc' }, take: 4 })
  } catch (e) {
    return (
      <div style={{ marginTop: '1.25rem', padding: '1.5rem', borderRadius: 16, background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <p style={{ color: '#f43f5e', margin: 0, fontSize: '0.875rem' }}>Failed to load Financial ERP data for this tenant.</p>
      </div>
    )
  }

  if (payrolls.length === 0 && invoices.length === 0) {
    return (
      <div style={{ marginTop: '1.25rem', padding: '1.5rem', borderRadius: 16, background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 1rem' }}>Financial ERP (Module I)</h3>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.8125rem' }}>No payroll or invoice data generated yet.</p>
      </div>
    )
  }

  return (
    <div style={{
      marginTop: '1.25rem', padding: '1.5rem', borderRadius: 16,
      background: 'var(--bg-surface)', border: '1px solid var(--border)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <span className="material-symbols-outlined" style={{ color: '#10b981', fontSize: '1.25rem' }}>account_balance</span>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Financial ERP Overview</h3>
      </div>
      
      <div className="row g-4">
        {/* Payroll Runs */}
        <div className="col-12 col-md-6">
          <div style={{ background: 'var(--bg-raised)', padding: '1.25rem', borderRadius: 12, border: '1px solid var(--border)' }}>
            <h4 style={{ fontSize: '0.8125rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 1rem' }}>Recent Payroll Executions</h4>
            {payrolls.length === 0 ? (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>No payroll batches processed.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {payrolls.map((pr: any) => (
                  <div key={pr.id.toString()} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.625rem', background: 'var(--bg-surface)', borderRadius: 8 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>Month: {pr.month}/{pr.year}</p>
                      <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Status: <span style={{ color: pr.status === 'COMPLETED' ? '#10b981' : '#f59e0b' }}>{pr.status}</span></p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#10b981' }}>₹{pr.totalAmount.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ERP Invoices */}
        <div className="col-12 col-md-6">
          <div style={{ background: 'var(--bg-raised)', padding: '1.25rem', borderRadius: 12, border: '1px solid var(--border)' }}>
            <h4 style={{ fontSize: '0.8125rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 1rem' }}>Recent ERP Invoices</h4>
            {invoices.length === 0 ? (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>No invoices created.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {invoices.map((inv: any) => (
                  <div key={inv.id.toString()} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.625rem', background: 'var(--bg-surface)', borderRadius: 8 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>#{inv.invoiceNumber}</p>
                      <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Tax: ₹{inv.taxAmount}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#10b981' }}>₹{inv.amount.toLocaleString()}</p>
                      <p style={{ margin: 0, fontSize: '0.6875rem', color: inv.status === 'PENDING' ? '#f59e0b' : '#10b981' }}>{inv.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
