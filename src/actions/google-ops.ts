'use server'

import { masterDb } from '@/lib/db'
import { getSession } from '@/lib/session'

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */

async function getGoogleTokensForTenant(tenantId: string) {
  const integration = await masterDb.tenantGoogleIntegration.findUnique({
    where: { tenantId },
  })
  if (!integration) return null

  // If token is expired try to refresh
  const now = new Date()
  const isExpired = integration.tokenExpiry ? integration.tokenExpiry < now : false

  if (isExpired && integration.refreshToken) {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      console.error('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not configured; cannot refresh Google tokens')
      return integration
    }

    try {
      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: integration.refreshToken,
          grant_type: 'refresh_token',
        }),
        cache: 'no-store',
      })
      const refreshData = await refreshRes.json()
      if (refreshData.access_token) {
        await masterDb.tenantGoogleIntegration.update({
          where: { tenantId },
          data: {
            accessToken: refreshData.access_token,
            tokenExpiry: new Date(Date.now() + (refreshData.expires_in || 3600) * 1000),
          },
        })
        return { ...integration, accessToken: refreshData.access_token }
      }
    } catch (e) {
      console.error('Token refresh failed:', e)
    }
  }

  return integration
}

async function assertSuperAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized: Super Admin only')
  }
  return session
}

/* ══════════════════════════════════════════════
   GOOGLE INTEGRATION STATUS
   ══════════════════════════════════════════════ */

export async function getTenantGoogleStatus(tenantId: string) {
  await assertSuperAdmin()
  const integration = await masterDb.tenantGoogleIntegration.findUnique({
    where: { tenantId },
    select: {
      email: true,
      googleAccountId: true,
      tokenExpiry: true,
      createdAt: true,
      updatedAt: true,
      accessToken: false, // never expose
      refreshToken: false,
    },
  })
  if (!integration) return { connected: false }

  const now = new Date()
  const isExpired = integration.tokenExpiry ? integration.tokenExpiry < now : false
  const expiresIn = integration.tokenExpiry
    ? Math.round((integration.tokenExpiry.getTime() - now.getTime()) / 60000)
    : null

  return {
    connected: true,
    email: integration.email,
    googleAccountId: integration.googleAccountId,
    tokenExpiry: integration.tokenExpiry?.toISOString() ?? null,
    isExpired,
    expiresInMinutes: expiresIn,
    connectedAt: integration.createdAt.toISOString(),
    lastUpdated: integration.updatedAt.toISOString(),
  }
}

/* ══════════════════════════════════════════════
   GMAIL OPERATIONS (on behalf of tenant)
   ══════════════════════════════════════════════ */

export async function getGmailInbox(tenantId: string, maxResults = 20) {
  await assertSuperAdmin()
  const tokens = await getGoogleTokensForTenant(tenantId)
  if (!tokens?.accessToken) return { success: false, error: 'Google not connected for this tenant', emails: [] }

  try {
    // List message IDs
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&labelIds=INBOX`,
      {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
        cache: 'no-store',
      }
    )
    const listData = await listRes.json()
    if (listData.error) return { success: false, error: listData.error.message, emails: [] }

    const messages = listData.messages || []

    // Fetch each message's snippet + metadata (parallel, limited)
    const emailDetails = await Promise.all(
      messages.slice(0, maxResults).map(async (msg: { id: string }) => {
        try {
          const msgRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
            {
              headers: { Authorization: `Bearer ${tokens.accessToken}` },
              cache: 'no-store',
            }
          )
          const msgData = await msgRes.json()
          const headers = msgData.payload?.headers || []
          const getHeader = (name: string) => headers.find((h: any) => h.name === name)?.value || ''
          return {
            id: msg.id,
            subject: getHeader('Subject') || '(No Subject)',
            from: getHeader('From'),
            date: getHeader('Date'),
            snippet: msgData.snippet || '',
            labelIds: msgData.labelIds || [],
            isUnread: (msgData.labelIds || []).includes('UNREAD'),
          }
        } catch {
          return null
        }
      })
    )

    return {
      success: true,
      emails: emailDetails.filter(Boolean),
      total: listData.resultSizeEstimate || messages.length,
    }
  } catch (e: any) {
    return { success: false, error: e.message, emails: [] }
  }
}

export async function sendGmailOnBehalf(
  tenantId: string,
  data: { to: string; subject: string; body: string }
) {
  await assertSuperAdmin()
  const tokens = await getGoogleTokensForTenant(tenantId)
  if (!tokens?.accessToken) return { success: false, error: 'Google not connected for this tenant' }

  try {
    // Construct RFC 2822 email
    const emailLines = [
      `To: ${data.to}`,
      `Subject: ${data.subject}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      data.body,
    ]
    const raw = Buffer.from(emailLines.join('\r\n'))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    const sendRes = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw }),
        cache: 'no-store',
      }
    )
    const sendData = await sendRes.json()
    if (sendData.error) return { success: false, error: sendData.error.message }
    return { success: true, messageId: sendData.id }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

/* ══════════════════════════════════════════════
   YOUTUBE OPERATIONS (on behalf of tenant)
   ══════════════════════════════════════════════ */

export async function getYouTubeChannel(tenantId: string) {
  await assertSuperAdmin()
  const tokens = await getGoogleTokensForTenant(tenantId)
  if (!tokens?.accessToken) return { success: false, error: 'Google not connected for this tenant' }

  try {
    const res = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&mine=true',
      {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
        cache: 'no-store',
      }
    )
    const data = await res.json()
    if (data.error) return { success: false, error: data.error.message }

    const channel = data.items?.[0]
    if (!channel) return { success: false, error: 'No YouTube channel found for this account' }

    return {
      success: true,
      channel: {
        id: channel.id,
        title: channel.snippet?.title,
        description: channel.snippet?.description,
        thumbnailUrl: channel.snippet?.thumbnails?.default?.url,
        country: channel.snippet?.country,
        publishedAt: channel.snippet?.publishedAt,
        subscriberCount: channel.statistics?.subscriberCount,
        videoCount: channel.statistics?.videoCount,
        viewCount: channel.statistics?.viewCount,
        bannerUrl: channel.brandingSettings?.image?.bannerMobileImageUrl,
      },
    }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function getYouTubeVideos(tenantId: string, maxResults = 20) {
  await assertSuperAdmin()
  const tokens = await getGoogleTokensForTenant(tenantId)
  if (!tokens?.accessToken) return { success: false, error: 'Google not connected', videos: [] }

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=${maxResults}&order=date`,
      {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
        cache: 'no-store',
      }
    )
    const data = await res.json()
    if (data.error) return { success: false, error: data.error.message, videos: [] }

    const videoIds = (data.items || []).map((v: any) => v.id?.videoId).filter(Boolean)

    // Get statistics for those videos
    const statsMap: Record<string, any> = {}
    if (videoIds.length > 0) {
      try {
        const statsRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=statistics,status&id=${videoIds.join(',')}`,
          {
            headers: { Authorization: `Bearer ${tokens.accessToken}` },
            cache: 'no-store',
          }
        )
        const statsData = await statsRes.json()
        for (const item of statsData.items || []) {
          statsMap[item.id] = { ...item.statistics, privacyStatus: item.status?.privacyStatus }
        }
      } catch { /* ignore stats failures */ }
    }

    const videos = (data.items || []).map((v: any) => {
      const vid = v.id?.videoId
      const stats = statsMap[vid] || {}
      return {
        id: vid,
        title: v.snippet?.title || '(Untitled)',
        description: v.snippet?.description || '',
        thumbnailUrl: v.snippet?.thumbnails?.medium?.url,
        publishedAt: v.snippet?.publishedAt,
        channelTitle: v.snippet?.channelTitle,
        viewCount: stats.viewCount,
        likeCount: stats.likeCount,
        commentCount: stats.commentCount,
        privacyStatus: stats.privacyStatus || 'unknown',
        videoUrl: `https://www.youtube.com/watch?v=${vid}`,
      }
    })

    return { success: true, videos }
  } catch (e: any) {
    return { success: false, error: e.message, videos: [] }
  }
}

export async function updateYouTubeVideoPrivacy(
  tenantId: string,
  videoId: string,
  privacyStatus: 'public' | 'private' | 'unlisted'
) {
  await assertSuperAdmin()
  const tokens = await getGoogleTokensForTenant(tenantId)
  if (!tokens?.accessToken) return { success: false, error: 'Google not connected' }

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=status`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: videoId,
          status: { privacyStatus },
        }),
        cache: 'no-store',
      }
    )
    const data = await res.json()
    if (data.error) return { success: false, error: data.error.message }
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function startYouTubeResumableUpload(
  tenantId: string,
  input: {
    title: string
    description?: string
    tags?: string[]
    privacyStatus: 'public' | 'private' | 'unlisted'
    fileSize: number
    mimeType: string
  }
) {
  await assertSuperAdmin()
  const tokens = await getGoogleTokensForTenant(tenantId)
  if (!tokens?.accessToken) return { success: false, error: 'Google not connected' }

  try {
    const res = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': input.mimeType || 'application/octet-stream',
          'X-Upload-Content-Length': String(input.fileSize || 0),
        },
        body: JSON.stringify({
          snippet: {
            title: input.title,
            description: input.description ?? '',
            tags: input.tags ?? [],
          },
          status: { privacyStatus: input.privacyStatus },
        }),
        cache: 'no-store',
      }
    )

    if (!res.ok) {
      const text = await res.text()
      return { success: false, error: text || `Failed to start upload (HTTP ${res.status})` }
    }

    const uploadUrl = res.headers.get('location') || res.headers.get('Location')
    if (!uploadUrl) {
      return { success: false, error: 'Upload session URL missing from YouTube' }
    }

    return { success: true, uploadUrl }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function setYouTubeVideoThumbnail(
  tenantId: string,
  videoId: string,
  thumbnail: { base64: string; mimeType: string }
) {
  await assertSuperAdmin()
  const tokens = await getGoogleTokensForTenant(tenantId)
  if (!tokens?.accessToken) return { success: false, error: 'Google not connected' }

  try {
    const bytes = Buffer.from(thumbnail.base64, 'base64')
    const res = await fetch(
      `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(videoId)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': thumbnail.mimeType || 'application/octet-stream',
        },
        body: bytes,
        cache: 'no-store',
      }
    )

    const data = await res.json().catch(() => null)
    if (!res.ok || (data && data.error)) {
      return { success: false, error: data?.error?.message || `Thumbnail failed (HTTP ${res.status})` }
    }

    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
