'use server'

import { masterDb, getTenantDb } from '@/lib/db'
import { createSession, deleteSession, getSession } from '@/lib/session'
import { LoginSchema } from '@/lib/validations'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'

export type AuthState = {
  errors?: { email?: string[]; password?: string[]; general?: string[] }
  message?: string
} | undefined

// ─── Login Action ──────────────────────────────────────────────────────────────
export async function loginAction(state: AuthState, formData: FormData): Promise<AuthState> {
  // 1. Validate input
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { email, password } = parsed.data

  // 2. Look up user across isolation domains sequentially
  let user = null;
  let resolvedTenantId = null;
  let resolvedDatabaseName: string | null = null;

  // Natively check master database tenants
  const allTenants = await masterDb.tenant.findMany({
    select: { databaseName: true, id: true }
  });

  // Inject a virtual root environment if omnicore HQ isn't physically tracked in master
  allTenants.push({ databaseName: 'omnicore_hq', id: 'ROOT-HQ' } as any)

  for (const t of allTenants) {
    try {
      const db = await getTenantDb(t.databaseName)
      const found = await db.user.findFirst({
        where: { email, deletedAt: null },
        select: {
          publicId: true,
          role: true,
          email: true,
          passwordHash: true,
        },
      })
      if (found) {
        user = found;
        resolvedTenantId = t.id;
        resolvedDatabaseName = t.databaseName;
        break;
      }
    } catch (err) {
      // Ignored if db doesn't exist natively yet
    }
  }

  if (!user) {
    return { errors: { general: ['Invalid email or password'] } }
  }

  // 3. Verify password
  const passwordMatch = await bcrypt.compare(password, user.passwordHash)
  if (!passwordMatch) {
    return { errors: { general: ['Invalid email or password'] } }
  }

  // 4. Create session securely caching resolved schema bindings
  await createSession({
    userId: user.publicId,
    tenantId: resolvedTenantId ?? '',
    databaseName: resolvedDatabaseName ?? '',
    role: user.role,
    email: user.email,
  })

  // 5. Redirect based on role
  if (user.role === 'SUPER_ADMIN') {
    redirect('/super-admin')
  } else if (user.role === 'TENANT_ADMIN' || user.role === 'STAFF') {
    redirect('/dashboard')
  } else {
    redirect('/portal')
  }
}

// ─── Logout Action ─────────────────────────────────────────────────────────────
export async function logoutAction(): Promise<void> {
  await deleteSession()
  redirect('/login')
}

// ─── Impersonation Actions (Super Admin Only) ──────────────────────────────────

export async function impersonateTenantAction(tenantId: string) {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized: Only Super Admins can impersonate tenants.')
  }

  const tenant = await masterDb.tenant.findUnique({
    where: { id: tenantId }
  })

  if (!tenant) throw new Error('Tenant not found')

  const db = await getTenantDb(tenant.databaseName)
  const targetUser = await db.user.findFirst({
    where: { role: 'TENANT_ADMIN', deletedAt: null }
  })

  if (!targetUser) throw new Error('No admin user found in target tenant')

  await createSession({
    userId: targetUser.publicId,
    tenantId: tenant.id,
    databaseName: tenant.databaseName,
    role: targetUser.role,
    email: targetUser.email,
    impersonatorId: session.userId, // Store the original super admin ID
  })

  redirect('/dashboard')
}

export async function impersonateEntityAction(tenantId: string, entityId: string) {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized')
  }

  const tenant = await masterDb.tenant.findUnique({
    where: { id: tenantId }
  })
  if (!tenant) throw new Error('Tenant not found')

  const db = await getTenantDb(tenant.databaseName)
  const entity = await db.businessEntity.findUnique({
    where: { id: BigInt(entityId) }
  })

  if (!entity) throw new Error('Entity not found')

  const targetUserId = entity.userId
  let targetUser: any = null

  if (targetUserId) {
    targetUser = await db.user.findUnique({
      where: { publicId: targetUserId }
    })
  }

  // If no user record, we "ghost" as them with limited role
  await createSession({
    userId: targetUser?.publicId || `GHOST-${entity.publicId}`,
    tenantId: tenant.id,
    databaseName: tenant.databaseName,
    role: targetUser?.role || 'CUSTOMER',
    email: targetUser?.email || `ghost-${entity.publicId}@nixvra.online`,
    impersonatorId: session.userId,
  })

  redirect('/dashboard')
}

export async function exitImpersonationAction() {
  const session = await getSession()
  if (!session || !session.impersonatorId) {
    redirect('/login')
  }

  const hqTenant = await masterDb.tenant.findFirst({ where: { subdomain: 'nixvra' } })
  const hqDb = await getTenantDb(hqTenant?.databaseName || 'omnicore_hq')
  const originalAdmin = await hqDb.user.findFirst({
    where: { publicId: session.impersonatorId, role: 'SUPER_ADMIN' }
  })

  if (!originalAdmin) {
    await deleteSession()
    redirect('/login')
  }

  await createSession({
    userId: originalAdmin.publicId,
    tenantId: 'ROOT-HQ',
    databaseName: hqTenant?.databaseName || 'omnicore_hq',
    role: originalAdmin.role,
    email: originalAdmin.email,
  })

  redirect('/super-admin')
}
