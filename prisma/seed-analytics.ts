/**
 * OMNICORE OS — Synthetic Analytics Data Seeder
 * This script injects 12 months of fake metrics (Transactions & Webhooks)
 * into all demo databases for UI and performance testing of the Super Admin dashboard.
 */

import { EntityType, TransactionStatus, PaymentGateway } from '@prisma/client'
import dotenv from 'dotenv'

// Config
const DAYS_BACK = 365;

// Random helpers
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randChoice<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

async function run() {
  dotenv.config({ path: '.env.local' });
  const { masterDb, getTenantDb } = await import('../src/lib/db');

  console.log('📈 Starting Analytics Seeder...');

  // Get all tenants except HQ
  const tenants = await masterDb.tenant.findMany({
    where: { databaseName: { not: 'omnicore_hq' } }
  });

  if (tenants.length === 0) {
    console.log('No demo tenants found. Run normal seed first.');
    process.exit(0);
  }

  const now = new Date();

  for (const tenant of tenants) {
    console.log(`\n⚙️ Injecting data into: ${tenant.databaseName}`);
    const db = await getTenantDb(tenant.databaseName);

    // 1. Clean existing analytics tables to prevent infinite bloat
    await db.transaction.deleteMany();
    await db.webhookEvent.deleteMany();
    console.log('  🗑️ Cleared existing transactions and webhooks.');

    // 2. Ensure at least one arbitrary business entity exists to tie transactions to
    let entity = await db.businessEntity.findFirst();
    if (!entity) {
      entity = await db.businessEntity.create({
        data: {
          type: EntityType.LEAD,
          name: 'Demo Synthetic Lead',
          contact: 'demo@synthetic.local'
        }
      });
    }

    const txBuffer: any[] = [];
    const whBuffer: any[] = [];

    // 3. Generate data day-by-day
    for (let d = DAYS_BACK; d >= 0; d--) {
      const currentDate = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
      
      // -- Transactions --
      // Tendency to have more transactions recently (growth curve)
      const maxTxPerDay = Math.floor(2 + (DAYS_BACK - d) * 0.05); 
      const txCount = randInt(0, maxTxPerDay);
      
      for (let i = 0; i < txCount; i++) {
        // slight jitter to the hour
        const txDate = new Date(currentDate);
        txDate.setHours(randInt(8, 22), randInt(0, 59));

        const isSuccess = Math.random() > 0.15; // 85% success rate
        const amount = randChoice([4900, 9900, 14900, 19900, 24900]);

        txBuffer.push({
          publicId: `tx_fake_${Date.now()}_${d}_${i}`,
          entityId: entity.publicId,
          amount,
          status: isSuccess ? TransactionStatus.PAID : TransactionStatus.FAILED,
          paymentGateway: PaymentGateway.RAZORPAY,
          createdAt: txDate,
          updatedAt: txDate
        });
      }

      // -- Webhooks --
      const whCount = randInt(1, maxTxPerDay + 3);
      for (let i = 0; i < whCount; i++) {
        const whDate = new Date(currentDate);
        whDate.setHours(randInt(0, 23), randInt(0, 59));

        const whStatusObj = Math.random() > 0.2 ? { status: 'PROCESSED' } : { status: 'FAILED' };
        
        whBuffer.push({
          publicId: `wh_fake_${Date.now()}_${d}_${i}`,
          source: randChoice(['META', 'RAZORPAY', 'CUSTOM']),
          payload: { summary: "Synthetic payload" },
          ...whStatusObj,
          createdAt: whDate,
          updatedAt: whDate
        });
      }
    }

    // 4. Batch Insert (chunking to avoid memory / arg limits)
    try {
      const CHUNK = 500;
      for (let i = 0; i < txBuffer.length; i += CHUNK) {
        await db.transaction.createMany({ data: txBuffer.slice(i, i + CHUNK) });
      }
      console.log(`  💲 Inserted ${txBuffer.length} transactions`);

      for (let i = 0; i < whBuffer.length; i += CHUNK) {
        await db.webhookEvent.createMany({ data: whBuffer.slice(i, i + CHUNK) });
      }
      console.log(`  🔌 Inserted ${whBuffer.length} webhooks`);
    } catch (e) {
      console.error(`Failed bulk insert for ${tenant.databaseName}:`, e);
    }
  }

  console.log('\n🎉 Synthetic Analytics Data Seeding Complete!');
  await masterDb.$disconnect();
}

run()
  .catch(e => {
    console.error('Fatal Seed Error:', e);
    process.exit(1);
  });
