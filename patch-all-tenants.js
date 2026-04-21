const mysql = require('mysql2/promise');

const DB_URL = "mysql://45fNy9AFAWj7Kur.root:UX2Xarz3IIVeLvVu@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000";

async function run() {
  const conn = await mysql.createConnection(DB_URL + "/test?ssl={\"rejectUnauthorized\":true}");
  console.log("Connected to master (test)");
  
  // 1. Add loginEnabled to tenant_google_integrations if missing
  try {
    await conn.query("ALTER TABLE tenant_google_integrations ADD COLUMN loginEnabled BOOLEAN DEFAULT true;");
    console.log("✅ Added loginEnabled to master");
  } catch(e) { console.log("loginEnabled exists:", e.message?.substring(0,60)); }
  
  // 2. Get all tenant databases
  const [tenants] = await conn.query("SELECT id, name, databaseName FROM tenants");
  console.log(`Found ${tenants.length} tenants`);
  
  // 3. Patch each tenant DB with missing columns
  for (const t of tenants) {
    try {
      const tConn = await mysql.createConnection(DB_URL + `/${t.databaseName}?ssl={"rejectUnauthorized":true}`);
      
      const cols = [
        "ALTER TABLE users ADD COLUMN emailVerified BOOLEAN DEFAULT false",
        "ALTER TABLE users ADD COLUMN emailVerificationToken VARCHAR(255)",
        "ALTER TABLE users ADD COLUMN emailVerificationExpiry DATETIME",
        "ALTER TABLE users ADD COLUMN googleId VARCHAR(255)",
      ];
      
      for (const sql of cols) {
        try { await tConn.query(sql); console.log(`  ✅ ${t.name}: ${sql.split('ADD COLUMN ')[1]?.split(' ')[0]}`); }
        catch(e) { /* already exists */ }
      }

      // Create products table if missing
      try {
        await tConn.query(`CREATE TABLE IF NOT EXISTS products (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          publicId CHAR(36) UNIQUE DEFAULT (UUID()),
          name VARCHAR(500) NOT NULL,
          sku VARCHAR(100),
          price DOUBLE NOT NULL,
          type VARCHAR(50) NOT NULL DEFAULT 'SERVICE',
          metadata JSON,
          deletedAt DATETIME,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`);
        console.log(`  ✅ ${t.name}: products table OK`);
      } catch(e) { console.log(`  products: ${e.message?.substring(0,40)}`); }

      // Create invoice_items table if missing
      try {
        await tConn.query(`CREATE TABLE IF NOT EXISTS invoice_items (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          publicId CHAR(36) UNIQUE DEFAULT (UUID()),
          invoiceId CHAR(36) NOT NULL,
          productId CHAR(36),
          itemName VARCHAR(500) NOT NULL,
          quantity DOUBLE NOT NULL,
          unitPrice DOUBLE NOT NULL,
          taxAmount DOUBLE DEFAULT 0,
          discount DOUBLE DEFAULT 0,
          total DOUBLE NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_invoiceId (invoiceId),
          INDEX idx_productId (productId)
        )`);
        console.log(`  ✅ ${t.name}: invoice_items table OK`);
      } catch(e) { console.log(`  invoice_items: ${e.message?.substring(0,40)}`); }

      // Seed 5 dummy products
      try {
        const [existing] = await tConn.query("SELECT COUNT(*) as c FROM products");
        if (existing[0].c === 0) {
          await tConn.query(`INSERT INTO products (name, sku, price, type) VALUES 
            ('Web Development', 'WEB-001', 25000, 'SERVICE'),
            ('Cloud Hosting', 'HOST-001', 5000, 'SUBSCRIPTION'),
            ('UI/UX Design', 'UX-001', 15000, 'SERVICE'),
            ('SEO Package', 'SEO-001', 8000, 'SERVICE'),
            ('Mobile App Dev', 'MOB-001', 50000, 'SERVICE')`);
          console.log(`  ✅ ${t.name}: 5 dummy products seeded`);
        }
      } catch(e) { console.log(`  products seed: ${e.message?.substring(0,60)}`); }

      await tConn.end();
    } catch(e) {
      console.log(`  ⚠️ ${t.name} (${t.databaseName}): ${e.message?.substring(0,60)}`);
    }
  }

  // 4. Also patch omnicore_hq (not tracked in tenants table)
  try {
    const hqConn = await mysql.createConnection(DB_URL + "/omnicore_hq?ssl={\"rejectUnauthorized\":true}");
    try {
      await hqConn.query(`INSERT INTO products (name, sku, price, type) SELECT 'Platform License','LIC-001',99000,'SERVICE' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM products LIMIT 1)`);
      console.log("✅ HQ products seeded");
    } catch(e) {}
    await hqConn.end();
  } catch(e) { console.log("HQ:", e.message?.substring(0,60)); }

  await conn.end();
  console.log("\n🎉 All tenant databases patched!");
}

run().catch(console.error);
