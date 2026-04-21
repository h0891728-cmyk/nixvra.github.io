import { NextRequest, NextResponse } from 'next/server'
import { masterDb, getTenantDb } from '@/lib/db'

/* ─── Provider maps ─────────────────────────────────────────── */
const PROVIDER_ENUM: Record<string, string> = {
  meta: 'META_GRAPH',
  whatsapp: 'WHATSAPP_CLOUD',
  stripe: 'STRIPE',
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params
  const { searchParams, origin } = new URL(request.url)

  const code = searchParams.get('code')
  const stateEncoded = searchParams.get('state')
  const originalError = searchParams.get('error')

  // --- Error from provider ---
  if (originalError) {
    return NextResponse.redirect(
      new URL(`/super-admin?error=${originalError}`, request.url)
    )
  }

  if (!code || !stateEncoded) {
    return NextResponse.redirect(
      new URL(`/super-admin?error=missing_params`, request.url)
    )
  }

  // --- Decode state ---
  let state: { tenantId: string; provider: string; timestamp: number; source?: string }
  try {
    state = JSON.parse(Buffer.from(stateEncoded, 'base64').toString('ascii'))
  } catch {
    return NextResponse.json({ error: 'Invalid state parameter' }, { status: 400 })
  }

  // --- Verify tenant ---
  const tenant = await masterDb.tenant.findUnique({
    where: { id: state.tenantId },
    select: { databaseName: true },
  })
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  const db = await getTenantDb(tenant.databaseName)
  const redirectTarget = state.source === 'superadmin'
    ? `/super-admin/tenants/${state.tenantId}`
    : '/dashboard/integrations'

  try {
    // --- Exchange code for access token (Meta / WhatsApp) ---
    const isMeta = provider === 'meta' || provider === 'whatsapp'

    if (!isMeta) {
      throw new Error(`Provider ${provider} exchange not implemented`)
    }

    const clientId = process.env.META_APP_ID!
    const clientSecret = process.env.META_APP_SECRET!
    const redirectUri = `${origin}/api/integrations/oauth/${provider}/callback`

    if (!clientId || !clientSecret) {
      throw new Error('META_APP_ID / META_APP_SECRET not configured in .env.local')
    }

    // ── 1. Exchange code → short-lived user token ──
    const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token')
    tokenUrl.searchParams.set('client_id', clientId)
    tokenUrl.searchParams.set('client_secret', clientSecret)
    tokenUrl.searchParams.set('code', code)
    tokenUrl.searchParams.set('redirect_uri', redirectUri)

    const tokenRes = await fetch(tokenUrl.toString(), { cache: 'no-store' })
    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      throw new Error(
        `Meta token exchange failed: ${tokenData.error.message} (code: ${tokenData.error.code})`
      )
    }

    let accessToken: string = tokenData.access_token

    // ── 2. Exchange short-lived → long-lived user token ──
    const llUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token')
    llUrl.searchParams.set('grant_type', 'fb_exchange_token')
    llUrl.searchParams.set('client_id', clientId)
    llUrl.searchParams.set('client_secret', clientSecret)
    llUrl.searchParams.set('fb_exchange_token', accessToken)

    const llRes = await fetch(llUrl.toString(), { cache: 'no-store' })
    const llData = await llRes.json()

    if (!llData.error && llData.access_token) {
      accessToken = llData.access_token // use long-lived token
    }

    // ── 3. Fetch user info ──
    const meRes = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${accessToken}`,
      { cache: 'no-store' }
    )
    const meData = await meRes.json()

    // ── 4. Fetch connected pages (for Meta Graph only) ──
    let pages: any[] = []
    let whatsappPhoneNumberId = ''
    let whatsappBusinessAccountId = ''

    if (provider === 'meta') {
      const pagesRes = await fetch(
        `https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`,
        { cache: 'no-store' }
      )
      const pagesData = await pagesRes.json()
      pages = (pagesData.data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        accessToken: p.access_token, // page-level token (permanent once granted)
      }))
    }

    if (provider === 'whatsapp') {
      // Fetch WhatsApp Business Account
      const wabaRes = await fetch(
        `https://graph.facebook.com/v19.0/${meData.id}/businesses?access_token=${accessToken}`,
        { cache: 'no-store' }
      )
      const wabaData = await wabaRes.json()
      const firstBiz = wabaData.data?.[0]
      if (firstBiz) {
        whatsappBusinessAccountId = firstBiz.id
        const phonesRes = await fetch(
          `https://graph.facebook.com/v19.0/${firstBiz.id}/phone_numbers?access_token=${accessToken}`,
          { cache: 'no-store' }
        )
        const phonesData = await phonesRes.json()
        whatsappPhoneNumberId = phonesData.data?.[0]?.id || ''
      }
    }

    const providerEnum = PROVIDER_ENUM[provider] || 'META_GRAPH'

    const metadataObj = {
      accountId: meData.id,
      accountName: meData.name,
      pages, // array of connected FB pages
      whatsappPhoneNumberId,
      whatsappBusinessAccountId,
      connectedAt: new Date().toISOString(),
      expiresIn: tokenData.expires_in,
      longLivedToken: !llData.error,
    }

    // ── 5. Upsert into tenant DB ──
    await db.tenantIntegration.upsert({
      where: { provider: providerEnum as any },
      create: {
        provider: providerEnum as any,
        accessToken,
        refreshToken: '',
        metadata: metadataObj,
        isActive: true,
      },
      update: {
        accessToken,
        refreshToken: '',
        metadata: metadataObj,
        isActive: true,
      },
    })

    return NextResponse.redirect(
      new URL(`${redirectTarget}?success=${provider}`, request.url)
    )
  } catch (error: any) {
    console.error(`[OAuth Callback Error] ${provider}:`, error.message)
    return NextResponse.redirect(
      new URL(
        `${redirectTarget}?error=${encodeURIComponent(error.message)}`,
        request.url
      )
    )
  }
}
