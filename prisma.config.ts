import { config } from "dotenv";
config({ path: ".env.local" });
import { defineConfig } from "prisma/config";

/**
 * OMNICORE OS — Prisma v7 Configuration
 * In Prisma v7, the database URL is no longer configured in schema.prisma.
 * It belongs here in prisma.config.ts.
 * 
 * DATABASE_URL falls back to a placeholder so `prisma generate` works
 * without a real DB connection. Set it in .env.local before migrating.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "mysql://root:password@localhost:3306/omnicore_os",
  },
});

