/**
 * Org-Specific Turso Database Client
 *
 * Multi-tenant database client - one Turso database per Clerk organization
 * Database naming: {clerk_org_id_without_underscores}-lux-ai-labs.aws-us-west-2.turso.io
 */

import { createClient, Client } from '@libsql/client';

// Database pool: one client per organization
const clientPool: Map<string, Client> = new Map();

/**
 * Get Turso client for a specific organization
 */
export function getOrgTursoClient(clerkOrgId: string): Client {
  if (!clerkOrgId || typeof clerkOrgId !== 'string') {
    throw new Error(
      `clerkOrgId is required and must be a string - got: ${typeof clerkOrgId} (${JSON.stringify(clerkOrgId)})`
    );
  }

  // Return existing client if available
  if (clientPool.has(clerkOrgId)) {
    return clientPool.get(clerkOrgId)!;
  }

  // Get auth token (shared across all org databases)
  const authToken = process.env['TURSO_AUTH_TOKEN'];
  if (!authToken) {
    throw new Error('Missing TURSO_AUTH_TOKEN environment variable');
  }

  // Construct database URL for this organization (lowercase for Turso compatibility)
  const tursoDbName = clerkOrgId.replace(/_/g, '').toLowerCase();
  const tursoUrl = `libsql://${tursoDbName}-lux-ai-labs.aws-us-west-2.turso.io`;

  // Create and cache new client
  const client = createClient({
    url: tursoUrl,
    authToken,
  });

  clientPool.set(clerkOrgId, client);
  return client;
}

/**
 * Helper to execute queries on org-specific database
 */
export async function executeOrgQuery(
  clerkOrgId: string,
  sql: string,
  args: any[] = []
): Promise<{ data: any[] | null; error: Error | null }> {
  try {
    const client = getOrgTursoClient(clerkOrgId);
    const result = await client.execute({ sql, args });
    return { data: result.rows as any[], error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}
