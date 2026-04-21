/**
 * push-tenant-schemas.js
 * Pushes schema.prisma to every tenant database by swapping the DB name in DATABASE_URL.
 * Run: node prisma/push-tenant-schemas.js
 */
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Load .env.local manually
const envPath = path.resolve(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const envVars = {}
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eqIdx = trimmed.indexOf('=')
  if (eqIdx === -1) continue
  const key = trimmed.slice(0, eqIdx).trim()
  const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
  envVars[key] = val
}

const MASTER_URL = envVars['DATABASE_URL']
if (!MASTER_URL) { console.error('DATABASE_URL not found in .env.local'); process.exit(1) }

// Build a URL for a specific database
function buildUrl(baseUrl, dbName) {
  const u = new URL(baseUrl)
  u.pathname = '/' + dbName
  return u.toString()
}

// Parse tenant list from master DB using raw mysql2
async function getTenants() {
  const mysql = require('mysql2/promise')
  const u = new URL(MASTER_URL)
  const conn = await mysql.createConnection({
    host: u.hostname,
    port: parseInt(u.port || '3306'),
    user: u.username,
    password: decodeURIComponent(u.password),
    database: u.pathname.slice(1),
    ssl: { rejectUnauthorized: false },
  })
  const [rows] = await conn.query('SELECT id, name, database_name FROM tenants')
  await conn.end()
  return rows
}

async function main() {
  let tenants = []
  try {
    tenants = await getTenants()
  } catch (e) {
    console.error('Failed to query tenants:', e.message)
    process.exit(1)
  }

  // Add HQ
  tenants.push({ id: 'HQ', name: 'OmniCore HQ', database_name: 'omnicore_hq' })

  console.log(`\n📦 Pushing schema to ${tenants.length} tenant database(s)...\n`)

  for (const t of tenants) {
    const dbUrl = buildUrl(MASTER_URL, t.database_name)
    process.stdout.write(`  → ${t.name} (${t.database_name})... `)
    try {
      execSync('npx prisma db push --schema=prisma/schema.prisma --accept-data-loss', {
        env: { ...process.env, ...envVars, DATABASE_URL: dbUrl },
        stdio: 'pipe',
        cwd: path.resolve(__dirname, '..'),
      })
      console.log('✅ done')
    } catch (e) {
      const msg = (e.stderr?.toString() || e.message || '').slice(0, 200)
      console.log(`❌ failed\n     ${msg}`)
    }
  }

  console.log('\n✅ Schema push complete.\n')
}

main()
