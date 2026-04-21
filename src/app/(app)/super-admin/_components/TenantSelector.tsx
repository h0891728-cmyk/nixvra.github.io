'use client'

import { useRouter } from 'next/navigation'

export default function TenantSelector({
  tenants,
  defaultValue = 'ALL',
}: {
  tenants: { id: string; name: string; subdomain: string }[]
  defaultValue?: string
}) {
  const router = useRouter()

  return (
    <select 
      value={defaultValue}
      onChange={(e) => {
        router.push(`?tenantId=${e.target.value}`)
      }}
      style={{
        padding: '0.625rem 2.5rem 0.625rem 1rem', 
        borderRadius: 10, background: 'var(--bg-raised)', 
        border: '1px solid var(--border)', color: 'var(--text-primary)', 
        fontSize: '0.875rem', fontWeight: 600, outline: 'none', cursor: 'pointer',
        appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto'
      }}
    >
      <option value="ALL">All Tenants (Top 100)</option>
      {tenants.map(t => (
        <option key={t.id} value={t.id}>{t.name} ({t.subdomain})</option>
      ))}
    </select>
  )
}
