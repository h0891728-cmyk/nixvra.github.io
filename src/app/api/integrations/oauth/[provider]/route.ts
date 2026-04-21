import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

// In a real application, these would be loaded from process.env
const PROVIDER_CONFIGS: Record<string, { authUrl: string; clientId: string; scope: string }> = {
  meta: {
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    clientId: process.env.META_APP_ID || '',
    scope: 'pages_show_list,instagram_basic,instagram_manage_comments,pages_read_engagement,pages_manage_posts,business_management',
  },
  stripe: {
    authUrl: 'https://connect.stripe.com/oauth/authorize',
    clientId: process.env.STRIPE_CLIENT_ID || '',
    scope: 'read_write',
  },
  whatsapp: {
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    clientId: process.env.META_APP_ID || '',
    scope: 'whatsapp_business_management,whatsapp_business_messaging',
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params
  
  const { searchParams } = new URL(request.url)
  const targetTenantId = searchParams.get('targetTenantId')

  // Await headers() in Next 15+
  const headersList = await headers()
  const tenantId = targetTenantId || headersList.get('x-tenant-id')

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized: No active tenant target.' }, { status: 401 })
  }

  const config = PROVIDER_CONFIGS[provider.toLowerCase()]
  if (!config) {
    return NextResponse.json({ error: `Provider ${provider} not supported for automated OAuth` }, { status: 400 })
  }

  // Generate redirect URL
  const baseUrl = new URL(request.url).origin
  const redirectUri = `${baseUrl}/api/integrations/oauth/${provider}/callback`
  
  const source = searchParams.get('source') || 'dashboard'
  
  // The state parameter ensures we know WHICH tenant initiated the request.
  // In a robust system we'd encrypt this or use an opaque state dictionary.
  const statePayload = JSON.stringify({ tenantId, provider, timestamp: Date.now(), source })
  const state = Buffer.from(statePayload).toString('base64')

  const url = new URL(config.authUrl)
  url.searchParams.set('client_id', config.clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', config.scope)
  url.searchParams.set('state', state)
  url.searchParams.set('response_type', 'code')

  // Redirect client to Provider OAuth portal
  return NextResponse.redirect(url)
}
