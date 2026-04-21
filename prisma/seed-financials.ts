import dotenv from 'dotenv'
dotenv.config({ path: './.env.local' })

async function main() {
  const { masterDb, getTenantDb } = await import('../src/lib/db')
  console.log('🌱 Seeding polymorphic financials (Fees, Salaries, Invoices)...')

  const tenants = await masterDb.tenant.findMany()

  for (const tenant of tenants) {
    if (tenant.databaseName === 'test') continue // skip default master mapped
    
    console.log(`\n===========================================`)
    console.log(`Seeding Financials: ${tenant.name} [${tenant.databaseName}]`)
    const db = await getTenantDb(tenant.databaseName)

    try {
      // Find one staff and one customer/student
      const staff = await db.businessEntity.findFirst({ where: { type: 'STAFF' }})
      const customer = await db.businessEntity.findFirst({ where: { type: { in: ['STUDENT', 'PATIENT', 'CUSTOMER'] } }})

      if (staff) {
        console.log(`  ...creating Salary Run for Staff: ${staff.name}`)
        const run = await db.payrollRun.create({
          data: { month: 4, year: 2026, totalAmount: 45000, status: 'COMPLETED', processedBy: 'SYSTEM', metadata: { type: 'SALARY' } }
        })
        await db.salarySlip.create({
          data: { payrollRunId: run.publicId, businessEntityId: staff.publicId, baseSalary: 45000, netPay: 41000, status: 'PAID' }
        })
      }

      if (customer) {
        console.log(`  ...creating Fee/Invoice Run for Customer: ${customer.name}`)
        const run = await db.payrollRun.create({
          data: { month: 4, year: 2026, totalAmount: 15000, status: 'COMPLETED', processedBy: 'SYSTEM', metadata: { type: 'FEES' } }
        })
        await db.salarySlip.create({
          data: { payrollRunId: run.publicId, businessEntityId: customer.publicId, baseSalary: 15000, netPay: 15000, status: 'PENDING' }
        })
      }
      
      console.log('  ✅ Seeded successfully')
    } catch(err: any) {
      console.error(`  ❌ Failed seeding ${tenant.name}:`, err.message)
    }
  }

  console.log('\n✅ All tenants seeded with financials!')
}

main().catch(console.error).finally(() => process.exit(0))
