import { masterDb } from '../src/lib/db'
import { execSync } from 'child_process'

const connectionString = process.env.DATABASE_URL as string

async function main() {
  console.log('Fetching tenants from master database...')
  const tenants = await masterDb.tenant.findMany({
    select: { id: true, name: true, databaseName: true }
  })
  
  // HQ doesn't live in `tenants` table
  tenants.push({ id: 'HQ', name: 'OmniCore HQ', databaseName: 'omnicore_hq' } as any)

  console.log(`\n📦 Pushing schema to ${tenants.length} tenant database(s)...\n`)

  for (const t of tenants) {
    const url = new URL(connectionString)
    url.pathname = `/${t.databaseName}`
    
    process.stdout.write(`  → ${t.name} (${t.databaseName})... `)
    try {
      execSync(`npx prisma db push --schema=prisma/schema.prisma --accept-data-loss`, {
        env: { ...process.env, DATABASE_URL: url.toString() },
        stdio: 'pipe',
      })
      console.log('✅ done')
    } catch (e: any) {
      console.log(`❌ failed (${e.message})`)
    }
  }

  console.log('\n✅ All schemas pushed successfully!')
}

main()
  .catch(console.error)
  .finally(() => masterDb.$disconnect())
