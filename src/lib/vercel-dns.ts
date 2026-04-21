/**
 * NIXVRA - Vercel Domain API Wrapper
 * Handles all interactions with the Vercel Projects API for domain management.
 * Docs: https://vercel.com/docs/rest-api/endpoints/domains
 */

const VERCEL_TOKEN = process.env.VERCEL_ACCESS_TOKEN
const PROJECT_ID = process.env.VERCEL_PROJECT_ID
const TEAM_ID = process.env.VERCEL_TEAM_ID

function teamQuery() {
  return TEAM_ID ? `?teamId=${TEAM_ID}` : ''
}

function teamQueryAppend(base: string) {
  return TEAM_ID ? `${base}&teamId=${TEAM_ID}` : base
}

function headers() {
  return {
    Authorization: `Bearer ${VERCEL_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

function assertCreds() {
  if (!VERCEL_TOKEN) throw new Error('VERCEL_ACCESS_TOKEN is not set in environment variables')
  if (!PROJECT_ID) throw new Error('VERCEL_PROJECT_ID is not set in environment variables')
}

// ── TYPES ─────────────────────────────────────────────────────────────────────

export type VercelDnsRecord = {
  type: 'A' | 'CNAME' | 'TXT' | 'AAAA'
  name: string
  value: string
}

export type VercelDomainConfig = {
  configuredBy: 'CNAME' | 'A' | 'http' | null
  acceptedChallenges: string[]
  misconfigured: boolean
  dns?: VercelDnsRecord[]
}

export type VercelDomainResult =
  | { success: true; config: VercelDomainConfig; requiredRecords: VercelDnsRecord[] }
  | { success: false; error: string }

export type VercelAddResult =
  | { success: true; domainId?: string }
  | { success: false; error: string; code?: string }

// ── ADD DOMAIN TO PROJECT ─────────────────────────────────────────────────────

export async function addDomainToVercel(domain: string): Promise<VercelAddResult> {
  assertCreds()
  const url = `https://api.vercel.com/v9/projects/${PROJECT_ID}/domains${teamQuery()}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ name: domain }),
    })
    const data = await res.json()

    if (!res.ok) {
      return {
        success: false,
        error: data.error?.message ?? 'Failed to add domain to Vercel',
        code: data.error?.code,
      }
    }

    return { success: true, domainId: data.name }
  } catch (err) {
    console.error('[VERCEL] addDomainToVercel:', err)
    return { success: false, error: 'Network error contacting Vercel API' }
  }
}

// ── GET DOMAIN DNS CONFIG ─────────────────────────────────────────────────────
// Returns whether domain is misconfigured + what records are needed

export async function getDomainConfig(domain: string): Promise<VercelDomainResult> {
  assertCreds()
  const url = teamQueryAppend(
    `https://api.vercel.com/v9/projects/${PROJECT_ID}/domains/${domain}/config?`
  )

  try {
    const res = await fetch(url, { method: 'GET', headers: headers() })
    const data = await res.json()

    if (!res.ok) {
      return { success: false, error: data.error?.message ?? 'Failed to fetch DNS config' }
    }

    // Build the list of records a user needs to add
    const requiredRecords: VercelDnsRecord[] = []

    if (data.misconfigured) {
      // Vercel tells us what it expects
      if (data.cnames?.length) {
        for (const cname of data.cnames) {
          requiredRecords.push({ type: 'CNAME', name: domain.split('.').slice(0, -2).join('.') || '@', value: cname })
        }
      }
      if (data.aValues?.length) {
        for (const a of data.aValues) {
          requiredRecords.push({ type: 'A', name: '@', value: a })
        }
      }
      // Fallback to our standard records if Vercel didn't provide specific ones
      if (requiredRecords.length === 0) {
        const isApex = domain.split('.').length === 2
        if (isApex) {
          requiredRecords.push({ type: 'A', name: '@', value: '76.76.21.21' })
        } else {
          requiredRecords.push({ type: 'CNAME', name: domain.split('.')[0], value: 'cname.vercel-dns.com' })
        }
      }
    }

    return {
      success: true,
      config: {
        configuredBy: data.configuredBy ?? null,
        acceptedChallenges: data.acceptedChallenges ?? [],
        misconfigured: data.misconfigured ?? true,
        dns: data.dns,
      },
      requiredRecords,
    }
  } catch (err) {
    console.error('[VERCEL] getDomainConfig:', err)
    return { success: false, error: 'Network error contacting Vercel API' }
  }
}

// ── CHECK DOMAIN STATUS ───────────────────────────────────────────────────────
// Quick poll: is domain active on Vercel?

export async function checkDomainVercelStatus(domain: string): Promise<{
  verified: boolean
  misconfigured: boolean
  requiredRecords: VercelDnsRecord[]
  error?: string
}> {
  const result = await getDomainConfig(domain)
  if (!result.success) return { verified: false, misconfigured: true, requiredRecords: [], error: result.error }

  return {
    verified: !result.config.misconfigured,
    misconfigured: result.config.misconfigured,
    requiredRecords: result.requiredRecords,
  }
}

// ── REMOVE DOMAIN FROM PROJECT ────────────────────────────────────────────────

export async function removeDomainFromVercel(domain: string): Promise<{ success: boolean; error?: string }> {
  assertCreds()
  const url = `https://api.vercel.com/v9/projects/${PROJECT_ID}/domains/${domain}${teamQuery()}`

  try {
    const res = await fetch(url, { method: 'DELETE', headers: headers() })
    if (res.status === 204 || res.ok) return { success: true }
    const data = await res.json()
    return { success: false, error: data.error?.message ?? 'Failed to remove domain from Vercel' }
  } catch (err) {
    console.error('[VERCEL] removeDomainFromVercel:', err)
    return { success: false, error: 'Network error contacting Vercel API' }
  }
}

// ── LIST PROJECT DOMAINS ──────────────────────────────────────────────────────

export async function listVercelDomains(): Promise<{ domains: any[]; error?: string }> {
  assertCreds()
  const url = teamQueryAppend(`https://api.vercel.com/v9/projects/${PROJECT_ID}/domains?limit=100&`)

  try {
    const res = await fetch(url, { method: 'GET', headers: headers() })
    const data = await res.json()
    if (!res.ok) return { domains: [], error: data.error?.message }
    return { domains: data.domains ?? [] }
  } catch (err) {
    console.error('[VERCEL] listVercelDomains:', err)
    return { domains: [], error: 'Network error' }
  }
}
