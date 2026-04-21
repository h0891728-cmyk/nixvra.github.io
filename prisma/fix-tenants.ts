import { masterDb } from '../src/lib/db'
import { execSync } from 'child_process'

const connectionString = process.env.DATABASE_URL as string

async function buildDB(databaseName: string) {
  const url = new URL(connectionString)
  url.pathname = `/${databaseName}`
  console.log(`\n⏳ Provisioning schema for: ${databaseName}...`)
  try {
    await masterDb.$executeRawUnsafe(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\`;`)
    execSync(`npx prisma db push --schema=prisma/schema.prisma --accept-data-loss`, {
      env: { ...process.env, DATABASE_URL: url.toString() },
      stdio: 'inherit',
    })
    console.log(`✅ Schema ready: ${databaseName}`)
  } catch (e: any) {
    console.error(`❌ Failed to provision ${databaseName}:`, e.message)
  }
}

async function main() {
  console.log('🔧 Fixing stale tenant database references...\n')

  // Update old tenants created before multi-DB migration
  const updates = [
    { subdomain: 'demo-clinic', databaseName: 'omnicore_demo_clinic' },
    { subdomain: 'demo-realty', databaseName: 'omnicore_demo_realty' },
  ]

  for (const u of updates) {
    try {
      await masterDb.tenant.update({
        where: { subdomain: u.subdomain },
        data: { databaseName: u.databaseName },
      })
      console.log(`✅ Updated ${u.subdomain} → ${u.databaseName}`)
      await buildDB(u.databaseName)
    } catch (e: any) {
      console.log(`ℹ️  Skipped ${u.subdomain}: ${e.message}`)
    }
  }

  console.log('\n🎉 All tenant databases provisioned!')
}

main()
  .catch(console.error)
  .finally(() => masterDb.$disconnect())
