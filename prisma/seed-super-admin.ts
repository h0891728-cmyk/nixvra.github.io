import { masterDb, getTenantDb } from '../src/lib/db'
import bcrypt from 'bcryptjs'

async function main() {
  const SUPER_ADMIN_EMAIL = 'nixvra.tech@gmail.com'
  const SUPER_ADMIN_PASSWORD = '7869@Hima#'
  const HQ_SUBDOMAIN = 'nixvra'
  const HQ_DATABASE = process.env.NIXVRA_HQ_DATABASE || 'omnicore_hq'

  console.log('Bootstrapping Nixvra Super Admin...')

  let hqTenant = await masterDb.tenant.findUnique({
    where: { subdomain: HQ_SUBDOMAIN },
  })

  if (!hqTenant) {
    hqTenant = await masterDb.tenant.create({
      data: {
        subdomain: HQ_SUBDOMAIN,
        name: 'Nixvra HQ',
        industry: 'OTHER',
        databaseName: HQ_DATABASE,
        modules: ['CRM', 'BILLING', 'ADS', 'SOCIAL'],
      },
    })
    console.log('Created Nixvra HQ tenant entry.')
  }

  const hqClient = await getTenantDb(hqTenant.databaseName || HQ_DATABASE)

  try {
    const email = SUPER_ADMIN_EMAIL.toLowerCase().trim()
    const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12)

    const existingUser = await hqClient.user.findFirst({
      where: { email },
    })

    if (existingUser) {
      await hqClient.user.update({
        where: { id: existingUser.id },
        data: {
          passwordHash,
          role: 'SUPER_ADMIN',
          emailVerified: true,
          updatedAt: new Date(),
        },
      })
      console.log('Updated existing Super Admin password and role.')
    } else {
      await hqClient.user.create({
        data: {
          email,
          passwordHash,
          role: 'SUPER_ADMIN',
          emailVerified: true,
        },
      })
      console.log('Created new Super Admin account.')
    }
  } catch (error: any) {
    console.error('Error provisioning Super Admin:', error.message)
  }

  console.log('\nNixvra super admin initialization complete.')
}

main()
  .catch(console.error)
  .finally(() => masterDb.$disconnect())
