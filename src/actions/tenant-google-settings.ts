'use server'

import { getSession } from '@/lib/session'
import { masterDb } from '@/lib/db'
import { revalidatePath } from 'next/cache'

// ─── Get tenant Google integration status ────────────────────────────────────
export async function getTenantGoogleStatusAction() {
  const session = await getSession()
  if (!session?.tenantId) return null

  try {
    const integration = await masterDb.tenantGoogleIntegration.findUnique({
      where: { tenantId: session.tenantId },
      select: {
        id: true,
        email: true,
        googleAccountId: true,
        loginEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    return integration
      ? {
          isConnected: true,
          email: integration.email,
          googleAccountId: integration.googleAccountId,
          loginEnabled: integration.loginEnabled,
          connectedAt: integration.createdAt.toISOString(),
          updatedAt: integration.updatedAt.toISOString(),
        }
      : { isConnected: false, loginEnabled: false }
  } catch {
    return { isConnected: false, loginEnabled: false }
  }
}

// ─── Toggle Google login enabled/disabled for this tenant ────────────────────
export async function toggleGoogleLoginAction(enabled: boolean): Promise<{ success: boolean; error?: string }> {
  const session = await getSession()
  if (!session?.tenantId) return { success: false, error: 'Not authenticated' }

  // Only tenant admins can change this setting
  if (session.role !== 'TENANT_ADMIN' && session.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Only admins can change this setting' }
  }

  try {
    const integration = await masterDb.tenantGoogleIntegration.findUnique({
      where: { tenantId: session.tenantId },
    })
    if (!integration) return { success: false, error: 'No Google account connected' }

    await masterDb.tenantGoogleIntegration.update({
      where: { tenantId: session.tenantId },
      data: { loginEnabled: enabled },
    })

    revalidatePath('/dashboard/settings')
    return { success: true }
  } catch (e: any) {
    console.error('[toggleGoogleLoginAction]', e)
    return { success: false, error: 'Failed to update setting' }
  }
}

// ─── Disconnect Google from this tenant workspace ─────────────────────────────
export async function disconnectGoogleAction(): Promise<{ success: boolean; error?: string }> {
  const session = await getSession()
  if (!session?.tenantId) return { success: false, error: 'Not authenticated' }

  if (session.role !== 'TENANT_ADMIN' && session.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Only admins can disconnect Google' }
  }

  try {
    await masterDb.tenantGoogleIntegration.deleteMany({
      where: { tenantId: session.tenantId },
    })

    revalidatePath('/dashboard/settings')
    return { success: true }
  } catch (e: any) {
    console.error('[disconnectGoogleAction]', e)
    return { success: false, error: 'Failed to disconnect Google' }
  }
}
