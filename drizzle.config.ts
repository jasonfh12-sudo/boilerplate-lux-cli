import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

/**
 * Get Turso database URL for migrations
 *
 * Production (Lux platform): Constructs from CLERK_ORG_ID
 * Development: Uses explicit TURSO_DATABASE_URL
 */
function getDatabaseUrl(): string {
  const orgId = process.env.CLERK_ORG_ID;

  if (orgId) {
    // Production: construct org-specific database URL
    const sanitizedOrgId = orgId.replace(/_/g, '').toLowerCase();
    return `libsql://${sanitizedOrgId}-lux-ai-labs.aws-us-west-2.turso.io`;
  }

  // Development: use explicit database URL
  if (process.env.TURSO_DATABASE_URL) {
    return process.env.TURSO_DATABASE_URL;
  }

  throw new Error(
    'Database configuration missing: Set either CLERK_ORG_ID (production) or TURSO_DATABASE_URL (development)'
  );
}

export default {
  schema: "./auth-schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: getDatabaseUrl(),
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
} satisfies Config;
