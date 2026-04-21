// OMNICORE OS — Plain JS Migration for TiDB
// Adds userId and expands ENUMs in business_entities

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env.local') })

const mariadb = require('mariadb')

const connectionString = process.env.DATABASE_URL
const url = new URL(connectionString)

const poolConfig = {
  host: url.hostname,
  port: parseInt(url.port || '4000', 10),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  ssl: { rejectUnauthorized: false },
  connectionLimit: 5,
}

async function run() {
  const masterPool = mariadb.createPool({ ...poolConfig, database: url.pathname.slice(1) })
  
  console.log('🔄 Starting migration: Module D Entities Sync...\n')

  let tenants = []
  try {
    tenants = await masterPool.query('SELECT id, name, databaseName FROM tenants')
  } catch (e) {
    console.error('Failed to fetch tenants:', e.message)
    await masterPool.end()
    return
  }
  
  // Also push to master root schema for continuity in tests
  tenants.push({ id: 'HQ', name: 'hq', databaseName: 'omnicore_hq' })

  for (const tenant of tenants) {
    console.log(`⚙️  Processing: ${tenant.name} (${tenant.databaseName})`)
    const pool = mariadb.createPool({ ...poolConfig, database: tenant.databaseName })
    
    try {
      // 1. ADD userId string
      const colCheck = await pool.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'business_entities' AND COLUMN_NAME = 'userId'`,
        [tenant.databaseName]
      )

      if (colCheck.length > 0) {
        console.log(`  ✅ userId column already exists`)
      } else {
        await pool.query(`ALTER TABLE \`business_entities\` ADD COLUMN \`userId\` CHAR(36) NULL`)
        await pool.query(`ALTER TABLE \`business_entities\` ADD UNIQUE INDEX (\`userId\`)`)
        console.log(`  ✅ Added userId column to business_entities`)
      }

      // 2. Modify ENUM on business_entities and add fat columns
      await pool.query(`ALTER TABLE \`business_entities\` MODIFY COLUMN \`type\` ENUM('STUDENT', 'PATIENT', 'LEAD', 'AGENT', 'CUSTOMER', 'VENDOR', 'STAFF', 'TEACHER', 'PARENT', 'PROPERTY', 'GROUP', 'ASSET') NOT NULL`)
      console.log(`  ✅ Expanded EntityType ENUM in business_entities`)

      // Check if description column exists
      const descCheck = await pool.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'business_entities' AND COLUMN_NAME = 'description'`,
        [tenant.databaseName]
      )
      if (descCheck.length === 0) {
        await pool.query(`ALTER TABLE \`business_entities\` ADD COLUMN \`description\` TEXT NULL, ADD COLUMN \`coreTrait\` VARCHAR(255) NULL, ADD COLUMN \`coreValue\` DECIMAL(15, 2) NULL`)
        console.log(`  ✅ Added fat generic columns (description, coreTrait, coreValue) to business_entities`)
      }

      // 3. Modify ENUM on custom_fields
      // Check if custom_fields exists
      const cfCheck = await pool.query(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'custom_fields'`,
        [tenant.databaseName]
      )
      if (cfCheck.length > 0) {
        await pool.query(`ALTER TABLE \`custom_fields\` MODIFY COLUMN \`entityType\` ENUM('STUDENT', 'PATIENT', 'LEAD', 'AGENT', 'CUSTOMER', 'VENDOR', 'STAFF', 'TEACHER', 'PARENT', 'PROPERTY', 'GROUP', 'ASSET') NOT NULL`)
        console.log(`  ✅ Expanded EntityType ENUM in custom_fields`)
      }

      // 4. Create Attendance Log Table if it doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS \`attendance_logs\` (
          \`id\` BIGINT NOT NULL AUTO_INCREMENT,
          \`publicId\` CHAR(36) NOT NULL,
          \`entityId\` CHAR(36) NOT NULL,
          \`date\` DATE NOT NULL,
          \`status\` ENUM('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE') NOT NULL,
          \`notes\` TEXT NULL,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updatedAt\` DATETIME(3) NOT NULL,
          PRIMARY KEY (\`id\`),
          UNIQUE INDEX \`attendance_logs_publicId_key\`(\`publicId\`),
          INDEX \`attendance_logs_entityId_date_idx\`(\`entityId\`, \`date\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `)
      console.log(`  ✅ Synced attendance_logs table natively`)

      // 5. Create Timeline Table if it doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS \`timeline_events\` (
          \`id\` BIGINT NOT NULL AUTO_INCREMENT,
          \`publicId\` CHAR(36) NOT NULL,
          \`entityId\` CHAR(36) NOT NULL,
          \`title\` VARCHAR(500) NOT NULL,
          \`description\` TEXT NULL,
          \`fileUrl\` VARCHAR(1000) NULL,
          \`fileMeta\` VARCHAR(100) NULL,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`),
          UNIQUE INDEX \`timeline_events_publicId_key\`(\`publicId\`),
          INDEX \`timeline_events_entityId_createdAt_idx\`(\`entityId\`, \`createdAt\` DESC)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `)
      console.log(`  ✅ Synced timeline_events table natively`)

      // 6. Create or patch Entity Relations Table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS \`entity_relations\` (
          \`id\` BIGINT NOT NULL AUTO_INCREMENT,
          \`publicId\` CHAR(36) NOT NULL,
          \`sourceEntityId\` CHAR(36) NOT NULL,
          \`targetEntityId\` CHAR(36) NOT NULL,
          \`relationType\` VARCHAR(100) NOT NULL,
          \`metadata\` JSON NULL,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`),
          UNIQUE INDEX \`entity_relations_publicId_key\`(\`publicId\`),
          INDEX \`entity_relations_sourceEntityId_idx\`(\`sourceEntityId\`),
          INDEX \`entity_relations_targetEntityId_idx\`(\`targetEntityId\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `)

      // Add metadata column if the table already existed without it
      const metaColCheck = await pool.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'entity_relations' AND COLUMN_NAME = 'metadata'`,
        [tenant.databaseName]
      )
      if (metaColCheck.length === 0) {
        await pool.query(`ALTER TABLE \`entity_relations\` ADD COLUMN \`metadata\` JSON NULL`)
        console.log(`  ✅ Added metadata column to entity_relations`)
      }

      // Drop the old rigid UNIQUE key if it still exists (Issue 5 fix)
      try {
        await pool.query(`ALTER TABLE \`entity_relations\` DROP INDEX \`entity_relations_source_target_type_key\``)
        console.log(`  ✅ Dropped rigid UNIQUE constraint from entity_relations`)
      } catch (_) { /* already gone */ }

      console.log(`  ✅ Synced entity_relations graph table natively`)

      // 7. Patch AttendanceLog — add markedById column (Issue 4 fix)
      const markedByCheck = await pool.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'attendance_logs' AND COLUMN_NAME = 'markedById'`,
        [tenant.databaseName]
      )
      if (markedByCheck.length === 0) {
        await pool.query(`ALTER TABLE \`attendance_logs\` ADD COLUMN \`markedById\` CHAR(36) NULL`)
        console.log(`  ✅ Added markedById column to attendance_logs`)
      } else {
        console.log(`  ✅ attendance_logs.markedById already exists`)
      }

      // 8. Financial ERP & Payroll (Module I)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS \`payroll_runs\` (
          \`id\` BIGINT NOT NULL AUTO_INCREMENT,
          \`publicId\` CHAR(36) NOT NULL,
          \`month\` INT NOT NULL,
          \`year\` INT NOT NULL,
          \`totalAmount\` DOUBLE NOT NULL,
          \`status\` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
          \`processedBy\` VARCHAR(100) NULL,
          \`metadata\` JSON NULL,
          \`deletedAt\` DATETIME(3) NULL,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`),
          UNIQUE INDEX \`payroll_runs_publicId_key\`(\`publicId\`),
          INDEX \`payroll_runs_month_year_idx\`(\`month\`, \`year\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `)

      await pool.query(`
        CREATE TABLE IF NOT EXISTS \`salary_slips\` (
          \`id\` BIGINT NOT NULL AUTO_INCREMENT,
          \`publicId\` CHAR(36) NOT NULL,
          \`payrollRunId\` CHAR(36) NOT NULL,
          \`businessEntityId\` CHAR(36) NOT NULL,
          \`baseSalary\` DOUBLE NOT NULL,
          \`allowances\` DOUBLE NOT NULL DEFAULT 0,
          \`deductions\` DOUBLE NOT NULL DEFAULT 0,
          \`netPay\` DOUBLE NOT NULL,
          \`status\` ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
          \`pdfUrl\` VARCHAR(1000) NULL,
          \`metadata\` JSON NULL,
          \`deletedAt\` DATETIME(3) NULL,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`),
          UNIQUE INDEX \`salary_slips_publicId_key\`(\`publicId\`),
          INDEX \`salary_slips_payrollRunId_idx\`(\`payrollRunId\`),
          INDEX \`salary_slips_businessEntityId_idx\`(\`businessEntityId\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `)

      await pool.query(`
        CREATE TABLE IF NOT EXISTS \`tax_configurations\` (
          \`id\` BIGINT NOT NULL AUTO_INCREMENT,
          \`publicId\` CHAR(36) NOT NULL,
          \`taxType\` VARCHAR(50) NOT NULL,
          \`rate\` DOUBLE NOT NULL,
          \`isActive\` TINYINT(1) NOT NULL DEFAULT 1,
          \`metadata\` JSON NULL,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`),
          UNIQUE INDEX \`tax_configurations_publicId_key\`(\`publicId\`),
          UNIQUE INDEX \`tax_configurations_taxType_key\`(\`taxType\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `)

      // Patch invoices Table
      const invCheck = await pool.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'invoiceNumber'`,
        [tenant.databaseName]
      )
      if (invCheck.length === 0) {
        await pool.query(`ALTER TABLE \`invoices\` ADD COLUMN \`invoiceNumber\` VARCHAR(100) NULL, ADD COLUMN \`taxAmount\` DOUBLE NOT NULL DEFAULT 0, ADD COLUMN \`pdfUrl\` VARCHAR(1000) NULL, ADD COLUMN \`dueDate\` DATE NULL`)
        await pool.query(`ALTER TABLE \`invoices\` ADD UNIQUE INDEX (\`invoiceNumber\`)`)
        console.log(`  ✅ Added ERP columns to invoices`)
      }

      console.log(`  ✅ Synced Module I (Payroll/ERP) natively`)

    } catch (e) {
      console.error(`  ❌ Error: ${e.message}`)
    } finally {
      await pool.end()
    }
  }

  await masterPool.end()
  console.log('\n🎉 Migration complete.')
}

run().catch(e => {
  console.error('Fatal:', e.message)
  process.exit(1)
})
