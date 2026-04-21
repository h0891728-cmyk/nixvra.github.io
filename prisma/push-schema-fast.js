const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
  envVars[key] = val;
}

const MASTER_URL = envVars['DATABASE_URL'];
if (!MASTER_URL) {
  console.error('DATABASE_URL not found in .env.local');
  process.exit(1);
}

function buildUrl(baseUrl, dbName) {
  const u = new URL(baseUrl);
  u.pathname = '/' + dbName;
  return u.toString();
}

async function main() {
  console.log('Fetching tenants from local API...');
  let tenants = [];
  try {
    const res = await fetch('http://localhost:3000/api/admin/get-tenants');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    tenants = await res.json();
  } catch (e) {
    console.error('Failed to fetch tenants. Make sure the dev server is running on port 3000.', e.message);
    process.exit(1);
  }

  tenants.push({ id: 'HQ', name: 'OmniCore HQ', databaseName: 'omnicore_hq' });
  console.log(`\n📦 Pushing schema to ${tenants.length} tenant database(s)...\n`);

  for (const t of tenants) {
    const dbUrl = buildUrl(MASTER_URL, t.databaseName);
    process.stdout.write(`  → ${t.name} (${t.databaseName})... `);
    try {
      execSync('npx prisma db push --schema=prisma/schema.prisma --accept-data-loss', {
        env: { ...process.env, ...envVars, DATABASE_URL: dbUrl },
        stdio: 'pipe',
        cwd: path.resolve(__dirname, '..'),
      });
      console.log('✅ done');
    } catch (e) {
      const msg = (e.stderr?.toString() || e.message || '').slice(0, 150).replace(/\n/g, ' ');
      console.log(`❌ failed (${msg})`);
    }
  }
  
  console.log('\n✅ Schema push complete.\n');
}

main();
