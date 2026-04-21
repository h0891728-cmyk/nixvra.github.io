const mysql = require('mysql2/promise');
const crypto = require('crypto');

const DB_URL = "mysql://45fNy9AFAWj7Kur.root:UX2Xarz3IIVeLvVu@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000";

function uuid() { return crypto.randomUUID(); }

async function run() {
  const conn = await mysql.createConnection(DB_URL + "/test?ssl={\"rejectUnauthorized\":true}");
  const [tenants] = await conn.query("SELECT id, name, databaseName FROM tenants");

  const dbs = [...tenants.map(t => t.databaseName), 'omnicore_hq'];

  for (const dbName of dbs) {
    try {
      const c = await mysql.createConnection(DB_URL + `/${dbName}?ssl={"rejectUnauthorized":true}`);
      const [existing] = await c.query("SELECT COUNT(*) as c FROM products");
      if (existing[0].c === 0) {
        const products = [
          [uuid(), 'Web Development', 'WEB-001', 25000, 'SERVICE'],
          [uuid(), 'Cloud Hosting', 'HOST-001', 5000, 'SERVICE'],
          [uuid(), 'UI/UX Design', 'UX-001', 15000, 'SERVICE'],
          [uuid(), 'SEO Package', 'SEO-001', 8000, 'SERVICE'],
          [uuid(), 'Mobile App Dev', 'MOB-001', 50000, 'SERVICE'],
        ];
        for (const p of products) {
          await c.query("INSERT INTO products (publicId, name, sku, price, type) VALUES (?, ?, ?, ?, ?)", p);
        }
        console.log(`✅ ${dbName}: 5 products seeded`);
      } else {
        console.log(`⏭️  ${dbName}: products already exist (${existing[0].c})`);
      }

      // Seed 3 dummy invoices if empty
      const [invCount] = await c.query("SELECT COUNT(*) as c FROM invoices");
      if (invCount[0].c === 0) {
        const [entities] = await c.query("SELECT publicId FROM business_entities LIMIT 3");
        for (let i = 0; i < Math.min(entities.length, 3); i++) {
          await c.query(
            "INSERT INTO invoices (publicId, businessEntityId, invoiceNumber, amount, taxAmount, status, dueDate) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [uuid(), entities[i].publicId, `INV-2026-${1001+i}`, 25000 + i*10000, 4500 + i*1800, 'PENDING', new Date(2026, 4, 15)]
          );
        }
        console.log(`✅ ${dbName}: ${Math.min(entities.length, 3)} dummy invoices seeded`);
      }

      await c.end();
    } catch(e) {
      console.log(`⚠️  ${dbName}: ${e.message?.substring(0,80)}`);
    }
  }

  await conn.end();
  console.log("\n🎉 Dummy data seeded everywhere!");
}

run().catch(console.error);
