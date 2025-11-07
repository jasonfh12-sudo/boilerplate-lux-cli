import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "@/auth-schema";

/**
 * Get Turso database URL for the current org
 *
 * In production (Lux container):
 * - Uses CLERK_ORG_ID to construct org-specific database URL
 * - Format: libsql://{orgId}-lux-ai-labs.aws-us-west-2.turso.io
 *
 * In development:
 * - Falls back to TURSO_DATABASE_URL for local testing
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

const client = createClient({
  url: getDatabaseUrl(),
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export const db = drizzle(client, { schema });
