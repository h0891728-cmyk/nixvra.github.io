'use server'

import { getSession } from '@/lib/session'
import { getTenantDb, masterDb } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { createSession } from '@/lib/session'
import { getEffectiveModules, isServiceEnabled } from '@/lib/modules'

export type ProfileActionState = {
  success?: boolean
  error?: string
} | undefined

/**
 * Change the logged-in user's password.
 * Verifies the current password before updating.
 */
export async function changePasswordAction(
  _state: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const session = await getSession()
  if (!session?.userId || !session.tenantId) return { error: 'Not authenticated' }

  const current = formData.get('currentPassword') as string
  const next = formData.get('newPassword') as string
  const confirm = formData.get('confirmPassword') as string

  if (!current || !next || !confirm) return { error: 'All fields are required' }
  if (next.length < 8) return { error: 'New password must be at least 8 characters' }
  if (next !== confirm) return { error: 'New passwords do not match' }

  try {
    const tenant = await masterDb.tenant.findUnique({
      where: { id: session.tenantId },
      select: { databaseName: true },
    })
    const dbName = tenant?.databaseName || 'omnicore_hq'
    const db = await getTenantDb(dbName)

    const user = await db.user.findUnique({
      where: { publicId: session.userId },
      select: { id: true, passwordHash: true },
    })
    if (!user) return { error: 'User not found' }

    const valid = await bcrypt.compare(current, user.passwordHash)
    if (!valid) return { error: 'Current password is incorrect' }

    const hash = await bcrypt.hash(next, 12)
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: hash, updatedAt: new Date() },
    })

    revalidatePath('/dashboard/settings')
    return { success: true }
  } catch (e: any) {
    console.error('[changePasswordAction]', e)
    return { error: 'Failed to update password. Please try again.' }
  }
}

/**
 * Change the logged-in user's email.
 * Verifies the current password before updating, and refreshes the session cookie.
 */
export async function changeEmailAction(
  _state: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const session = await getSession()
  if (!session?.userId || !session.tenantId) return { error: 'Not authenticated' }

  const password = formData.get('password') as string
  const nextEmailRaw = formData.get('newEmail') as string
  const confirmRaw = formData.get('confirmEmail') as string

  const nextEmail = (nextEmailRaw || '').toLowerCase().trim()
  const confirmEmail = (confirmRaw || '').toLowerCase().trim()

  if (!password || !nextEmail || !confirmEmail) return { error: 'All fields are required' }
  if (nextEmail !== confirmEmail) return { error: 'Emails do not match' }
  if (!nextEmail.includes('@') || nextEmail.length < 6) return { error: 'Enter a valid email address' }

  try {
    const tenant = await masterDb.tenant.findUnique({
      where: { id: session.tenantId },
      select: { databaseName: true },
    })
    const dbName = tenant?.databaseName || 'omnicore_hq'
    const db = await getTenantDb(dbName)

    const user = await db.user.findUnique({
      where: { publicId: session.userId },
      select: { id: true, email: true, passwordHash: true },
    })
    if (!user) return { error: 'User not found' }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return { error: 'Password is incorrect' }

    if (user.email.toLowerCase() === nextEmail) {
      return { error: 'That is already your current email' }
    }

    const existing = await db.user.findUnique({ where: { email: nextEmail } })
    if (existing) return { error: 'A user with that email already exists in this workspace' }

    await db.user.update({
      where: { id: user.id },
      data: { email: nextEmail, emailVerified: false, updatedAt: new Date() },
    })

    // Refresh the session payload so the UI reflects the new email immediately.
    await createSession({ ...session, email: nextEmail })

    revalidatePath('/dashboard/settings')
    return { success: true }
  } catch (e: any) {
    console.error('[changeEmailAction]', e)
    return { error: 'Failed to update email. Please try again.' }
  }
}

/**
 * Update the logged-in user's display name (stored in the entity linked to this user,
 * or just returns the email if no entity is linked).
 */
export async function getUserProfileAction() {
  const session = await getSession()
  if (!session?.userId || !session.tenantId) return null

  try {
    const tenant = await masterDb.tenant.findUnique({
      where: { id: session.tenantId },
      select: { id: true, name: true, subdomain: true, databaseName: true, modules: true, services: true, plan: true, planStatus: true },
    })
    if (!tenant) return null

    const db = await getTenantDb(tenant.databaseName)
    const user = await db.user.findUnique({
      where: { publicId: session.userId },
      select: { publicId: true, email: true, role: true, createdAt: true },
    })
    if (!user) return null

    // Also check if a BusinessEntity is linked to this user
    const linkedProfile = await db.businessEntity.findFirst({
      where: { userId: session.userId, deletedAt: null },
      select: { publicId: true, name: true, type: true, contact: true },
    })

    // Google integration status
    const googleIntegration = await masterDb.tenantGoogleIntegration.findUnique({
      where: { tenantId: session.tenantId },
      select: { email: true, googleAccountId: true, loginEnabled: true, createdAt: true },
    })

    const entitledModules = (tenant.modules as string[]) ?? []
    const services = (tenant.services as Record<string, boolean> | null) ?? null
    const activeModules = getEffectiveModules(entitledModules, services)

    return {
      user: {
        publicId: user.publicId,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      },
      linkedProfile: linkedProfile
        ? {
            publicId: linkedProfile.publicId,
            name: linkedProfile.name,
            type: linkedProfile.type,
            contact: linkedProfile.contact,
          }
        : null,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        plan: tenant.plan,
        planStatus: tenant.planStatus,
        modules: activeModules,
        entitledModules,
        services: services ?? {},
        enabledServiceCount: ['CRM', 'BILLING', 'SOCIAL', 'ADS', 'CHAT', 'YOUTUBE'].filter(key => {
          if ((services?.[key] ?? true) === false) return false
          if (['CRM', 'BILLING', 'SOCIAL', 'ADS'].includes(key)) return activeModules.includes(key)
          if (key === 'CHAT' || key === 'YOUTUBE') return activeModules.includes('SOCIAL') && isServiceEnabled(services, key)
          return true
        }).length,
      },
      google: googleIntegration
        ? {
            isConnected: true,
            email: googleIntegration.email,
            googleAccountId: googleIntegration.googleAccountId,
            loginEnabled: googleIntegration.loginEnabled,
            connectedAt: googleIntegration.createdAt.toISOString(),
          }
        : { isConnected: false as const, loginEnabled: false },
    }
  } catch (e) {
    console.error('[getUserProfileAction]', e)
    return null
  }
}
