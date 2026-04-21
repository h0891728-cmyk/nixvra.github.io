import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { requireModule } from '@/lib/modules'
import { masterDb } from '@/lib/db'
import ExpensesDashboard from '@/components/dashboard/expenses/ExpensesDashboard'

export const dynamic = 'force-dynamic'

export default async function TenantExpensesPage() {
  const session = await getSession()
  if (!session || !session.tenantId) redirect('/login')

  await requireModule('BILLING')

  const tenant = await masterDb.tenant.findUnique({
    where: { id: session.tenantId },
    select: { name: true, subdomain: true },
  })

  return (
    <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ marginBottom: '1.75rem' }}>
        <h1
          style={{
            fontSize: '1.375rem',
            fontWeight: 900,
            color: 'var(--text-primary)',
            margin: '0 0 0.4rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: '#f43f5e' }}>
            receipt_long
          </span>
          Spending & Expenses
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', margin: 0 }}>
          Manage vendor expenses, internal spending, and payment approvals.
        </p>
      </header>

      <ExpensesDashboard
        tenantId={session.tenantId}
        role={session.role}
        tenantName={tenant?.name || 'Nixvra Workspace'}
        tenantSubdomain={tenant?.subdomain || 'workspace'}
      />
    </div>
  )
}
