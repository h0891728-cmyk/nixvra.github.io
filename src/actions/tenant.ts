'use server'

import { masterDb, getTenantDb } from '@/lib/db'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { execSync } from 'child_process'
import bcrypt from 'bcryptjs'

const ALL_MODULES = ['CRM', 'ADS', 'SCHEDULING', 'WEBHOOKS', 'BILLING', 'SOCIAL', 'ANALYTICS', 'AUDIT']

// ── CREATE TENANT ────────────────────────────────────────────────────────────
export async function createTenantAction(formData: FormData) {
  const name = (formData.get('name') as string).trim()
  const subdomain = (formData.get('subdomain') as string).toLowerCase().trim().replace(/[^a-z0-9-]/g, '')
  const industry = formData.get('industry') as string
  const adminEmail = (formData.get('adminEmail') as string).trim()
  const adminPassword = formData.get('adminPassword') as string
  const modules = ALL_MODULES.filter(m => formData.get(`module_${m}`) === 'on')
  const plan = (formData.get('plan') as string) || 'TRIAL'
  const planAmount = parseFloat((formData.get('planAmount') as string) || '0')
  const billingCycle = (formData.get('billingCycle') as string) || 'MONTHLY'
  const planExpiryStr = formData.get('planExpiry') as string
  const planExpiryDate = planExpiryStr ? new Date(planExpiryStr) : null

  if (!name || !subdomain || !industry || !adminEmail || !adminPassword) {
    throw new Error('All fields are required')
  }

  const databaseName = `omnicore_${subdomain.replace(/-/g, '_')}`
  const connectionString = process.env.DATABASE_URL as string

  // 1. Create tenant record in master DB
  const tenant = await masterDb.tenant.create({
    data: {
      name,
      subdomain,
      industry: industry as any,
      modules: modules.length > 0 ? modules : ['CRM', 'BILLING'],
      databaseName,
      isIsolated: true,
      plan: plan as any,
      planAmount,
      billingCycle: billingCycle as any,
      planStatus: plan === 'TRIAL' ? 'TRIAL' : 'ACTIVE' as any,
      ...(planExpiryDate && { planExpiryDate }),
    },
  })

  // 2. Provision isolated TiDB database
  await masterDb.$executeRawUnsafe(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\`;`)

  // 3. Push schema to new database
  const url = new URL(connectionString)
  url.pathname = `/${databaseName}`
  execSync(`npx prisma db push --schema=prisma/schema.prisma --accept-data-loss`, {
    env: { ...process.env, DATABASE_URL: url.toString() },
    stdio: 'pipe',
  })

  // 4. Create initial admin user in new tenant DB
  const db = await getTenantDb(databaseName)
  const hash = await bcrypt.hash(adminPassword, 12)
  await db.user.create({
    data: {
      role: 'TENANT_ADMIN',
      email: adminEmail,
      passwordHash: hash,
    },
  })

  revalidatePath('/super-admin/tenants')
  redirect(`/super-admin/tenants/${tenant.id}`)
}

// ── UPDATE TENANT ────────────────────────────────────────────────────────────
export async function updateTenantAction(id: string, formData: FormData) {
  const name = (formData.get('name') as string).trim()
  const industry = formData.get('industry') as string
  const modules = ALL_MODULES.filter(m => formData.get(`module_${m}`) === 'on')
  const plan = formData.get('plan') as string
  const planAmount = parseFloat((formData.get('planAmount') as string) || '0')
  const billingCycle = formData.get('billingCycle') as string
  const planExpiryStr = formData.get('planExpiry') as string
  const planExpiryDate = planExpiryStr ? new Date(planExpiryStr) : undefined
  const planStatus = formData.get('planStatus') as string

  await masterDb.tenant.update({
    where: { id },
    data: {
      name,
      industry: industry as any,
      modules,
      plan: plan as any,
      planAmount,
      billingCycle: billingCycle as any,
      planStatus: planStatus as any,
      ...(planExpiryDate && { planExpiryDate }),
    },
  })

  revalidatePath(`/super-admin/tenants/${id}`)
  revalidatePath('/super-admin/tenants')
  revalidatePath('/dashboard')  // Force tenant sidebar to reflect new module list
}

// ── TOGGLE MODULE ─────────────────────────────────────────────────────────────
export async function toggleModuleAction(id: string, module: string, enabled: boolean) {
  const tenant = await masterDb.tenant.findUnique({ where: { id }, select: { modules: true } })
  if (!tenant) return

  const current = (tenant.modules as string[]) ?? []
  const updated = enabled
    ? [...new Set([...current, module])]
    : current.filter(m => m !== module)

  await masterDb.tenant.update({ where: { id }, data: { modules: updated } })
  revalidatePath(`/super-admin/tenants/${id}`)
  revalidatePath('/dashboard')  // Tenant sidebar updates immediately
}

// ── DELETE TENANT ─────────────────────────────────────────────────────────────
export async function deleteTenantAction(id: string) {
  const tenant = await masterDb.tenant.findUnique({ where: { id }, select: { databaseName: true } })
  if (!tenant) return

  // Drop the isolated database
  try {
    await masterDb.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${tenant.databaseName}\`;`)
  } catch (_) {}

  await masterDb.tenant.delete({ where: { id } })

  revalidatePath('/super-admin/tenants')
  redirect('/super-admin/tenants')
}
