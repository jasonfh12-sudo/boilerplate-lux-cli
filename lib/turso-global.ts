/**
 * Global Turso Database Client
 *
 * Used for fetching webhook token data from the global database
 * Database: lux-platform-global-lux-ai-labs.aws-us-west-2.turso.io
 */

import { createClient, Client } from '@libsql/client';

let globalClient: Client | null = null;

/**
 * Get the global Turso client (shared across all orgs)
 */
export function getGlobalTursoClient(): Client {
  if (globalClient) {
    return globalClient;
  }

  const authToken = process.env['TURSO_AUTH_TOKEN'];
  if (!authToken) {
    throw new Error('Missing TURSO_AUTH_TOKEN environment variable');
  }

  globalClient = createClient({
    url: 'libsql://lux-platform-global-lux-ai-labs.aws-us-west-2.turso.io',
    authToken,
  });

  return globalClient;
}

/**
 * Helper to execute queries on global database
 */
export async function executeGlobalQuery(
  sql: string,
  args: any[] = []
): Promise<{ data: any[] | null; error: Error | null }> {
  try {
    const client = getGlobalTursoClient();
    const result = await client.execute({ sql, args });
    return { data: result.rows as any[], error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}
