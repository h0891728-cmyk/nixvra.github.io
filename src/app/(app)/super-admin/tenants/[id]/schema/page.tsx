import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { masterDb } from '@/lib/db'
import SchemaManagerClient from './_components/SchemaManagerClient'
import { getTenantSchemaAction } from '@/actions/super-admin-schema'

export const dynamic = 'force-dynamic'

export default async function SuperAdminTenantSchemaPage(props: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') {
    redirect('/login')
  }

  const { id } = await props.params

  const tenant = await masterDb.tenant.findUnique({
    where: { id },
  })

  if (!tenant) {
    redirect('/super-admin/tenants')
  }

  const customFields = await getTenantSchemaAction(tenant.id)

  return (
    <div style={{ padding: '2rem', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
         <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.75rem', fontWeight: 900 }}>Schema & CRM Form Provisioning</h1>
         <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            Super Admin Access: Building Custom Polymorphic Attributes for <b>{tenant.name}</b>
         </p>
      </div>

      <SchemaManagerClient tenantId={tenant.id} tenantIndustry={tenant.industry} initialFields={customFields} />
    </div>
  )
}
