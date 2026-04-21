/**
 * NIXVRA - Multi-Database Prisma Router
 * Handles Master DB requests natively while dynamically spawning connection 
 * configurations for TiDB Schema-isolated Database environments.
 */

import { PrismaClient as MasterClient } from '@prisma/master-client'
import { PrismaClient as TenantClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const connectionString = process.env.DATABASE_URL as string || "mysql://root:@localhost:3306/nixvra_os"
const parsedUrl = new URL(connectionString)
const isTiDB = parsedUrl.hostname.includes('tidbcloud')

function buildPoolConfig(databaseName: string) {
  return {
    host: parsedUrl.hostname,
    port: parseInt(parsedUrl.port || '3306', 10),
    user: decodeURIComponent(parsedUrl.username),
    password: decodeURIComponent(parsedUrl.password),
    database: databaseName,
    ssl: isTiDB ? { rejectUnauthorized: true } : false,
    connectionLimit: 10,
    connectTimeout: 20000,
    acquireTimeout: 30000,
  }
}

const globalForPrisma = globalThis as unknown as { 
  masterDb?: MasterClient, 
  tenantDbs?: Map<string, TenantClient>
}

// ── 1. MASTER DB PROVISIONING ──
export const masterDb =
  globalForPrisma.masterDb ??
  new MasterClient({
    adapter: new PrismaMariaDb(buildPoolConfig(parsedUrl.pathname.substring(1))),
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

// ── 2. DYNAMIC TENANT DB PROVISIONING ──
if (!globalForPrisma.tenantDbs) {
  globalForPrisma.tenantDbs = new Map<string, TenantClient>()
}
export const tenantDbs = globalForPrisma.tenantDbs

export async function getTenantDb(databaseName: string): Promise<TenantClient> {
  if (!databaseName) throw new Error("CRITICAL: No tenant databaseName provided to getTenantDb().")

  if (tenantDbs.has(databaseName)) {
    return tenantDbs.get(databaseName)!
  }

  // Construct new pool isolating this tenant completely on TiDB Cloud
  const tenantClient = new TenantClient({
    adapter: new PrismaMariaDb(buildPoolConfig(databaseName)),
    log: [], // Errors are caught gracefully in try/catch — no log bleed
  })

  tenantDbs.set(databaseName, tenantClient)
  return tenantClient
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.masterDb = masterDb
}
