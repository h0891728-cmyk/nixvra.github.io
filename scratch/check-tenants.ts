import { PrismaClient } from '@prisma/master-client'
const db = new PrismaClient()

async function check() {
  const tenants = await db.tenant.findMany()
  console.log('Count:', tenants.length)
  console.log(JSON.stringify(tenants, null, 2))
}

check()
  .catch(console.error)
  .finally(() => db.$disconnect())
