/**
 * NIXVRA - Name.com Domain Registrar API Wrapper
 * Handles domain search, purchase, and automatic DNS provisioning.
 * Docs: https://www.name.com/api-docs
 *
 * Base URL is set via NAMECOM_API_URL env:
 *   Production: https://api.name.com
 *   Dev/Test:   https://api.dev.name.com  (no real charges)
 */

const NAMECOM_USERNAME = process.env.NAMECOM_USERNAME
const NAMECOM_TOKEN = process.env.NAMECOM_TOKEN
const NAMECOM_API_URL = process.env.NAMECOM_API_URL ?? 'https://api.name.com'

// ── INTERNAL HELPERS ──────────────────────────────────────────────────────────

function authHeader() {
  const encoded = Buffer.from(`${NAMECOM_USERNAME}:${NAMECOM_TOKEN}`).toString('base64')
  return {
    Authorization: `Basic ${encoded}`,
    'Content-Type': 'application/json',
  }
}

async function namecomFetch(path: string, options?: RequestInit) {
  const url = `${NAMECOM_API_URL}/v4${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      ...authHeader(),
      ...(options?.headers ?? {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

// ── TYPES ─────────────────────────────────────────────────────────────────────

export type DomainSearchResult = {
  available: boolean
  domain: string
  purchasePrice?: number
  purchaseType?: string
  renewalPrice?: number
  currency?: string
  premium?: boolean
}

export type DomainPurchaseResult =
  | { success: true; orderId: string; total: number; domain: string }
  | { success: false; error: string }

export type DnsRecord = {
  id?: number
  domainName?: string
  host: string      // sub-domain portion (blank = apex)
  type: 'A' | 'CNAME' | 'TXT' | 'MX' | 'AAAA' | 'NS'
  answer: string
  ttl?: number
}

export type DnsResult =
  | { success: true; record: DnsRecord }
  | { success: false; error: string }

// ── SEARCH / CHECK AVAILABILITY ───────────────────────────────────────────────

export async function searchDomain(query: string): Promise<{
  results: DomainSearchResult[]
  error?: string
}> {
  const domainName = query.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')

  try {
    const { ok, data } = await namecomFetch('/domains:search', {
      method: 'POST',
      body: JSON.stringify({ keyword: domainName, tldFilter: [] }),
    })

    if (!ok) {
      return { results: [], error: data?.message ?? 'Search failed' }
    }

    // name.com returns `results` array; each has `domainName`, `purchasable`, `purchasePrice`, etc.
    const results: DomainSearchResult[] = (data.results ?? []).slice(0, 10).map((r: any) => ({
      available: r.purchasable === true,
      domain: r.domainName,
      purchasePrice: r.purchasePrice,
      renewalPrice: r.renewalPrice,
      purchaseType: r.purchaseType,
      currency: 'USD',
      premium: r.premium ?? false,
    }))

    return { results }
  } catch (err) {
    console.error('[NAMECOM] searchDomain:', err)
    return { results: [], error: 'Network error contacting Name.com API' }
  }
}

// ── CHECK SINGLE DOMAIN ───────────────────────────────────────────────────────

export async function checkDomainAvailability(domain: string): Promise<DomainSearchResult> {
  try {
    const { ok, data } = await namecomFetch(`/domains:checkAvailability`, {
      method: 'POST',
      body: JSON.stringify({ domainNames: [domain] }),
    })

    if (!ok || !data.results?.length) {
      return { available: false, domain }
    }

    const r = data.results[0]
    return {
      available: r.purchasable === true,
      domain: r.domainName,
      purchasePrice: r.purchasePrice,
      renewalPrice: r.renewalPrice,
      currency: 'USD',
      premium: r.premium ?? false,
    }
  } catch (err) {
    console.error('[NAMECOM] checkDomainAvailability:', err)
    return { available: false, domain }
  }
}

// ── PURCHASE DOMAIN ───────────────────────────────────────────────────────────

export async function purchaseDomain(domain: string, purchasePrice: number, years = 1): Promise<DomainPurchaseResult> {
  try {
    const { ok, data } = await namecomFetch('/domains', {
      method: 'POST',
      body: JSON.stringify({
        domain: { domainName: domain },
        purchasePrice, // exactly matches expected price
        years,
        // Privacy protection free on most TLDs
        privacyEnabled: true,
      }),
    })

    if (!ok) {
      console.error('[NAMECOM PURCHASE FAILED] raw response:', data)
      return { success: false, error: data?.message || data?.details || 'Purchase failed - check server logs for raw response' }
    }

    return {
      success: true,
      orderId: String(data.order?.orderId ?? data.orderId ?? 'unknown'),
      total: data.order?.totalAmount ?? data.totalAmount ?? 0,
      domain: data.domain?.domainName ?? domain,
    }
  } catch (err) {
    console.error('[NAMECOM] purchaseDomain:', err)
    return { success: false, error: 'Network error during domain purchase' }
  }
}

// ── CREATE DNS RECORD ─────────────────────────────────────────────────────────

export async function createDnsRecord(domainName: string, record: DnsRecord): Promise<DnsResult> {
  try {
    const { ok, data } = await namecomFetch(`/domains/${domainName}/records`, {
      method: 'POST',
      body: JSON.stringify({
        host: record.host,
        type: record.type,
        answer: record.answer,
        ttl: record.ttl ?? 300,
      }),
    })

    if (!ok) {
      return { success: false, error: data?.message ?? 'Failed to create DNS record' }
    }

    return { success: true, record: data }
  } catch (err) {
    console.error('[NAMECOM] createDnsRecord:', err)
    return { success: false, error: 'Network error creating DNS record' }
  }
}

// ── LIST DNS RECORDS ──────────────────────────────────────────────────────────

export async function listDnsRecords(domainName: string): Promise<DnsRecord[]> {
  try {
    const { ok, data } = await namecomFetch(`/domains/${domainName}/records`, { method: 'GET' })
    if (!ok) return []
    return data.records ?? []
  } catch {
    return []
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-PROVISION: Purchase + Configure DNS in one shot
//
// After buying from Name.com this sets up:
//   - CNAME subdomain → cname.vercel-dns.com  (for subdomains)
//   - A record @      → 76.76.21.21           (for apex domains)
//   - TXT record for Vercel ownership verification
// ─────────────────────────────────────────────────────────────────────────────

export async function autoProvisionDomain(domain: string, purchasePrice: number, verifyToken: string): Promise<{
  success: boolean
  orderId?: string
  dnsConfigured: boolean
  errors: string[]
}> {
  const errors: string[] = []

  // Step 1: Purchase
  const purchase = await purchaseDomain(domain, purchasePrice)
  if (!purchase.success) {
    return { success: false, dnsConfigured: false, errors: [purchase.error] }
  }

  const orderId = purchase.orderId
  const isApex = domain.split('.').length === 2

  // Step 2: Set primary DNS record (A or CNAME)
  if (isApex) {
    // Root domain → A record pointing to Vercel IP
    const aResult = await createDnsRecord(domain, { host: '', type: 'A', answer: '76.76.21.21', ttl: 300 })
    if (!aResult.success) errors.push(`A record: ${aResult.error}`)
  } else {
    // Subdomain → CNAME
    const sub = domain.split('.')[0]
    const cResult = await createDnsRecord(domain.split('.').slice(1).join('.'), {
      host: sub, type: 'CNAME', answer: 'cname.vercel-dns.com', ttl: 300,
    })
    if (!cResult.success) errors.push(`CNAME record: ${cResult.error}`)
  }

  // Step 3: TXT record for ownership verification
  const txtResult = await createDnsRecord(domain, { host: '_vercel', type: 'TXT', answer: verifyToken, ttl: 300 })
  if (!txtResult.success) errors.push(`TXT record: ${txtResult.error}`)

  return {
    success: true,
    orderId,
    dnsConfigured: errors.length === 0,
    errors,
  }
}

// ── GET DOMAIN INFO ───────────────────────────────────────────────────────────

export async function getDomainInfo(domain: string): Promise<{
  found: boolean
  expireDate?: string
  locked?: boolean
  autorenewEnabled?: boolean
}> {
  try {
    const { ok, data } = await namecomFetch(`/domains/${domain}`, { method: 'GET' })
    if (!ok) return { found: false }
    return {
      found: true,
      expireDate: data.expireDate,
      locked: data.locked,
      autorenewEnabled: data.autorenewEnabled,
    }
  } catch {
    return { found: false }
  }
}
