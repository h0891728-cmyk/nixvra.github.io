import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export type SessionPayload = {
  userId: string
  tenantId: string
  databaseName: string
  role: string
  email: string
  impersonatorId?: string
}

const SESSION_COOKIE = 'nixvra_session'
const LEGACY_SESSION_COOKIE = 'omnicore_session'

const secretKey = process.env.SESSION_SECRET
if (!secretKey) throw new Error('SESSION_SECRET environment variable is not set')
const encodedKey = new TextEncoder().encode(secretKey)

// ─── Encrypt ─────────────────────────────────────────────────────────────────
export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey)
}

// ─── Decrypt ─────────────────────────────────────────────────────────────────
export async function decrypt(token: string | undefined = ''): Promise<SessionPayload | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, encodedKey, { algorithms: ['HS256'] })
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

// ─── Create Session ───────────────────────────────────────────────────────────
export async function createSession(data: SessionPayload): Promise<void> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const session = await encrypt(data)
  const cookieStore = await cookies()

  cookieStore.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })

  // Clean up legacy cookie name after login.
  cookieStore.delete(LEGACY_SESSION_COOKIE)
}

// ─── Get Session ──────────────────────────────────────────────────────────────
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value ?? cookieStore.get(LEGACY_SESSION_COOKIE)?.value
  return decrypt(token)
}

// ─── Update / Refresh Session ─────────────────────────────────────────────────
export async function updateSession(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value ?? cookieStore.get(LEGACY_SESSION_COOKIE)?.value
  const payload = await decrypt(token)

  if (!token || !payload) return

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const newToken = await encrypt(payload)

  cookieStore.set(SESSION_COOKIE, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })

  // If we refreshed from a legacy cookie, keep only the new name going forward.
  cookieStore.delete(LEGACY_SESSION_COOKIE)
}

// ─── Delete Session ───────────────────────────────────────────────────────────
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  cookieStore.delete(LEGACY_SESSION_COOKIE)
}
