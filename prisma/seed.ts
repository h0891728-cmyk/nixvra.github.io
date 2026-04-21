/**
 * OMNICORE OS — Multi-Database TiDB Seed
 * Provisions: Master Tenant records -> Logical DB creation -> Schema Push -> Seeding
 */

import { masterDb, getTenantDb } from '../src/lib/db'
import { UserRole, EntityType, TransactionStatus, PaymentGateway } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { execSync } from 'child_process'

const connectionString = (process.env.DATABASE_URL as string) || "mysql://root:@localhost:4000/test"
const parsedUrl = new URL(connectionString)

async function pushTenantSchema(databaseName: string) {
  const url = new URL(connectionString)
  url.pathname = `/${databaseName}`
  // Run db push synchronously for this specific logical database mapping!
  console.log(`\n⏳ Pushing Prisma schema to TiDB isolated instance: ${databaseName}...`)
  execSync(`npx prisma db push --schema=prisma/schema.prisma --accept-data-loss`, {
    env: { ...process.env, DATABASE_URL: url.toString() },
    stdio: 'inherit'
  })
}

async function main() {
  console.log('🌱 Starting OmniCore OS Multi-Database Seed...\n')

  // ─── 1. SUPER ADMIN TENANT ────────────────────────────────────────────────
  const superTenant = await masterDb.tenant.upsert({
    where: { subdomain: 'omnicore' },
    update: { databaseName: 'omnicore_hq' },
    create: {
      subdomain: 'omnicore',
      name: 'OmniCore HQ',
      industry: 'SERVICES',
      modules: ['CRM', 'ADS', 'SCHEDULING', 'WEBHOOKS', 'BILLING', 'AUDIT'],
      databaseName: 'omnicore_hq'
    },
  })
  console.log(`✅ Super Tenant mapped: ${superTenant.name}`)

  await masterDb.$executeRawUnsafe(`CREATE DATABASE IF NOT EXISTS \`${superTenant.databaseName}\`;`)
  await pushTenantSchema(superTenant.databaseName)
  const hqDb = await getTenantDb(superTenant.databaseName)

  // ─── 2. ROOT SUPER ADMIN USER ─────────────────────────────────────────────
  const rootHash = await bcrypt.hash('OmniCore@2025!', 12)
  await hqDb.user.deleteMany({ where: { email: 'admin@omnicore.app' } })
  const rootUser = await hqDb.user.create({
    data: {
      role: UserRole.SUPER_ADMIN,
      email: 'admin@omnicore.app',
      passwordHash: rootHash,
    },
  })
  console.log(`✅ Root Admin created inside ${superTenant.databaseName}: ${rootUser.email}`)

  // ─── 3. DEMO EDUCATION TENANT ─────────────────────────────────────────────
  const eduTenant = await masterDb.tenant.upsert({
    where: { subdomain: 'demo-school' },
    update: { databaseName: 'omnicore_demo_school' },
    create: {
      subdomain: 'demo-school',
      name: 'Sunrise Academy',
      industry: 'EDUCATION',
      modules: ['CRM', 'BILLING', 'WEBHOOKS'],
      databaseName: 'omnicore_demo_school'
    },
  })
  console.log(`✅ Demo Edu Tenant mapped: ${eduTenant.name}`)

  await masterDb.$executeRawUnsafe(`CREATE DATABASE IF NOT EXISTS \`${eduTenant.databaseName}\`;`)
  await pushTenantSchema(eduTenant.databaseName)
  const eduDb = await getTenantDb(eduTenant.databaseName)

  const eduAdminHash = await bcrypt.hash('Demo@12345!', 12)
  await eduDb.user.deleteMany({ where: { email: 'admin@sunrise.edu' } })
  const eduAdmin = await eduDb.user.create({
    data: {
      role: UserRole.TENANT_ADMIN,
      email: 'admin@sunrise.edu',
      passwordHash: eduAdminHash,
    },
  })
  console.log(`✅ Edu Admin created inside ${eduTenant.databaseName}`)

  // ─── SAMPLE ENTITIES & TX ─────────────────────────────────────────
  await eduDb.businessEntity.deleteMany({})
  const student = await eduDb.businessEntity.create({
    data: {
      type: EntityType.STUDENT,
      name: 'Aarav Sharma',
      contact: 'aarav@example.com',
    },
  })

  await eduDb.transaction.deleteMany({})
  await eduDb.transaction.create({
    data: {
      entityId: student.publicId,
      amount: 14500,
      status: TransactionStatus.PAID,
      paymentGateway: PaymentGateway.RAZORPAY,
    },
  })
  console.log(`✅ Entities & Invoices injected in ${eduTenant.databaseName}`)

  // ─── FIX LEGACY DEMO TENANTS ────────────────────────────────────────────── 
  const legacyFixes = [
    { subdomain: 'demo-clinic', name: 'MediCare Clinic', industry: 'HEALTHCARE', databaseName: 'omnicore_demo_clinic' },
    { subdomain: 'demo-realty', name: 'Horizon Properties', industry: 'REAL_ESTATE', databaseName: 'omnicore_demo_realty' },
  ]

  for (const fix of legacyFixes) {
    try {
      await masterDb.tenant.upsert({
        where: { subdomain: fix.subdomain },
        update: { databaseName: fix.databaseName },
        create: {
          subdomain: fix.subdomain, name: fix.name,
          industry: fix.industry as any,
          modules: ['CRM', 'BILLING', 'WEBHOOKS'],
          databaseName: fix.databaseName,
        },
      })
      await masterDb.$executeRawUnsafe(`CREATE DATABASE IF NOT EXISTS \`${fix.databaseName}\`;`)
      const url = new URL(connectionString)
      url.pathname = `/${fix.databaseName}`
      execSync(`npx prisma db push --schema=prisma/schema.prisma --accept-data-loss`, {
        env: { ...process.env, DATABASE_URL: url.toString() },
        stdio: 'inherit',
      })
      console.log(`✅ Provisioned: ${fix.subdomain} → ${fix.databaseName}`)
    } catch (e: any) {
      console.log(`ℹ️  ${fix.subdomain}: ${e.message}`)
    }
  }

  // ─── SUMMARY ──────────────────────────────────────────────────────────────
  console.log('\n🎉 OmniCore OS Multi-Database Architecture Seed Complete!\n')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await masterDb.$disconnect()
  })
