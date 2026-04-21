import { PrismaClient as MasterClient } from '@prisma/master-client'

const masterDb = new MasterClient()

async function main() {
  const tenants = await masterDb.tenant.findMany()
  console.log(tenants.map(t => t.id + ' -> ' + t.name).join('\n'))
  process.exit(0)
}
main()
