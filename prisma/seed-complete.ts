import dotenv from 'dotenv'
dotenv.config({ path: './.env.local' })
import bcrypt from 'bcryptjs'
import { execSync } from 'child_process'
import { UserRole, EntityType, TransactionStatus, PaymentGateway, SocialPostStatus, AdStatus, AdObjective, PayrollStatus, TaskStatus, TaskPriority, AttendanceStatus } from '@prisma/client'

const connectionString = (process.env.DATABASE_URL as string) || "mysql://root:@localhost:4000/test"

async function hashPassword(pw: string) {
  return await bcrypt.hash(pw, 12)
}

async function pushTenantSchema(databaseName: string) {
  const url = new URL(connectionString)
  url.pathname = `/${databaseName}`
  console.log(`\n⏳ Syncing schema: ${databaseName}...`)
  execSync(`npx prisma db push --schema=prisma/schema.prisma --accept-data-loss`, {
    env: { ...process.env, DATABASE_URL: url.toString() },
    stdio: 'inherit'
  })
}

async function main() {
  const { masterDb, getTenantDb } = await import('../src/lib/db')
  console.log('🌱 Starting COMPLETE SYSTEM SEED...\n')

  const defaultPassHash = await hashPassword('password123')
  const rootPassHash = await hashPassword('OmniCore@2025!')
  const now = new Date()

  // 1. PROVISION MASTER TENANTS
  const tenantConfigs = [
    { subdomain: 'omnicore', name: 'OmniCore HQ', industry: 'SERVICES', db: 'omnicore_hq' },
    { subdomain: 'demo-school', name: 'Sunrise Academy', industry: 'EDUCATION', db: 'omnicore_demo_school' },
    { subdomain: 'demo-clinic', name: 'MediCare Clinic', industry: 'HEALTHCARE', db: 'omnicore_demo_clinic' },
    { subdomain: 'demo-realty', name: 'Horizon Properties', industry: 'REAL_ESTATE', db: 'omnicore_demo_realty' },
  ]

  for (const tc of tenantConfigs) {
    console.log(`\n[MASTER] Provisioning Tenant: ${tc.name}`)
    await masterDb.tenant.upsert({
      where: { subdomain: tc.subdomain },
      update: { databaseName: tc.db },
      create: {
        subdomain: tc.subdomain,
        name: tc.name,
        industry: tc.industry as any,
        modules: ['CRM', 'ADS', 'SCHEDULING', 'BILLING', 'AUDIT', 'PAYROLL'],
        databaseName: tc.db
      },
    })
    
    // Physical DB creation
    await masterDb.$executeRawUnsafe(`CREATE DATABASE IF NOT EXISTS \`${tc.db}\`;`)
    await pushTenantSchema(tc.db)
    const db = await getTenantDb(tc.db)

    // 2. CLEAR TENANT DATA
    console.log('  ...purging old data')
    await db.entityRelation.deleteMany({})
    await db.businessEntity.deleteMany({})
    await db.socialPost.deleteMany({})
    await db.adCampaign.deleteMany({})
    await db.payrollRun.deleteMany({})
    await db.transaction.deleteMany({})
    await db.webhookEvent.deleteMany({})
    await db.task.deleteMany({})
    await db.attendanceLog.deleteMany({})
    await db.timelineEvent.deleteMany({})
    await db.user.deleteMany({})

    // 3. CREATE USERS
    const isHQ = tc.db === 'omnicore_hq'
    if (isHQ) {
      await db.user.create({
        data: { email: 'admin@omnicore.app', role: 'SUPER_ADMIN', passwordHash: rootPassHash }
      })
      console.log('  ✅ Super Admin: admin@omnicore.app / OmniCore@2025!')
      
      // Mock Google Integration in Master DB for this tenant
      await masterDb.tenantGoogleIntegration.upsert({
        where: { tenantId: 'omnicore-id-placeholder' }, // logic would resolve this normally
        create: {
          tenantId: (await masterDb.tenant.findUnique({ where: { subdomain: 'omnicore' } }))!.id,
          googleAccountId: '123456789',
          email: 'admin@omnicore.app',
          accessToken: 'mock_access_token',
          refreshToken: 'mock_refresh_token',
          tokenExpiry: new Date(Date.now() + 3600000)
        },
        update: {}
      })
    }

    const tenantAdminEmail = isHQ ? 'staff@omnicore.app' : `admin@${tc.subdomain}.com`
    await db.user.create({
      data: { email: tenantAdminEmail, role: 'TENANT_ADMIN', passwordHash: defaultPassHash }
    })
    console.log(`  ✅ Tenant Admin: ${tenantAdminEmail} / password123`)

    // 4. CRM & ENTITIES (Simplified industry-specific)
    const entitiesToCreate: any[] = []
    if (tc.industry === 'EDUCATION') {
      entitiesToCreate.push({ type: 'TEACHER', name: 'Mrs. Sarah Connor', coreTrait: 'Mathematics', coreValue: 5000 })
      entitiesToCreate.push({ type: 'STUDENT', name: 'John Connor', coreTrait: 'Grade 10', coreValue: 1200 })
    } else if (tc.industry === 'HEALTHCARE') {
      entitiesToCreate.push({ type: 'STAFF', name: 'Dr. House', coreTrait: 'Diagnostics', coreValue: 15000 })
      entitiesToCreate.push({ type: 'PATIENT', name: 'Wilson', coreTrait: 'Outpatient', coreValue: 200 })
    } else {
      entitiesToCreate.push({ type: 'STAFF', name: 'Alice Agent', coreTrait: 'Sales', coreValue: 8000 })
      entitiesToCreate.push({ type: 'LEAD', name: 'Bob Buyer', coreTrait: 'High Interest', coreValue: 50000 })
    }

    for (const ent of entitiesToCreate) {
      await db.businessEntity.create({ data: ent })
    }
    const allEnts = await db.businessEntity.findMany()

    // 5. MARKETING DATA
    console.log('  ...seeding marketing')
    await db.socialPost.createMany({
      data: [
        { platforms: ['facebook', 'instagram'], caption: 'Welcome to OmniCore OS!', mediaUrl: '', status: 'PUBLISHED', createdAt: new Date(Date.now() - 86400000 * 2) },
        { platforms: ['facebook'], caption: 'Check out our new module.', mediaUrl: '', status: 'SCHEDULED', scheduledFor: new Date(Date.now() + 86400000) },
        { platforms: ['instagram'], caption: 'Flash Sale! 🔥', mediaUrl: '', status: 'FAILED', metadata: { error: 'Invalid access token' } as any },
        { platforms: ['facebook', 'instagram'], caption: 'Drafting future ideas...', mediaUrl: '', status: 'DRAFT' },
      ]
    })

    await db.adCampaign.create({
      data: { 
        objective: 'LEADS', budget: 50000, status: 'ACTIVE', 
        metrics: { impressions: 12450, clicks: 840, leads: 42, spent: 12500 } as any 
      }
    })

    // 6. FINANCIAL DATA
    console.log('  ...seeding financials')
    const payroll = await db.payrollRun.create({
      data: { month: 4, year: 2026, totalAmount: 150000, status: 'COMPLETED', processedBy: 'admin' }
    })
    if (allEnts.length > 0) {
      await db.salarySlip.create({
        data: { payrollRunId: payroll.publicId, businessEntityId: allEnts[0].publicId, baseSalary: 50000, netPay: 45000, status: 'PAID' }
      })
    }

    // 7. ANALYTICS (100 days of history)
    const txs: any[] = []
    for (let i = 100; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      txs.push({
        entityId: allEnts[0]?.publicId || 'dummy',
        amount: Math.floor(Math.random() * 10000) + 1000,
        status: 'PAID',
        paymentGateway: 'RAZORPAY',
        createdAt: d
      })
    }
    await db.transaction.createMany({ data: txs })

    // 8. OPERATIONS (Tasks & Attendance)
    console.log('  ...seeding ops')
    await db.task.createMany({
      data: [
        { title: 'Finalize payroll', status: 'TODO', priority: 'HIGH', creatorId: 'SYSTEM' },
        { title: 'Update team profile', status: 'DONE', priority: 'LOW', creatorId: 'SYSTEM' },
      ]
    })
    
    if (allEnts.length > 0) {
      await db.attendanceLog.create({
        data: { entityId: allEnts[0].publicId, date: new Date(), status: 'PRESENT' }
      })
    }
  }

  console.log('\n🎉 ALL DATA SEEDED SUCCESSFULLY!')
  console.log('-------------------------------------------')
  console.log('Login: admin@omnicore.app / OmniCore@2025!')
  console.log('-------------------------------------------')
}

main().catch(console.error).finally(() => process.exit(0))
