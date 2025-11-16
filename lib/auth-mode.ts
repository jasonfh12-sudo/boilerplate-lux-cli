/**
 * Auth Mode Utilities
 *
 * Handles the three authentication modes:
 * - none: No authentication required
 * - single-tenant: All users share a default organization
 * - multi-tenant: Full organization support
 */

export type AuthMode = 'none' | 'single-tenant' | 'multi-tenant';

export const AUTH_MODE = (process.env.AUTH_MODE || 'multi-tenant') as AuthMode;

// Default org ID for single-tenant mode
export const SINGLE_TENANT_ORG_ID = 'single-tenant-default';
export const SINGLE_TENANT_ORG_NAME = 'Default Organization';

/**
 * Check if auth is completely disabled
 */
export function isNoAuth(): boolean {
  return AUTH_MODE === 'none';
}

/**
 * Check if single-tenant mode
 */
export function isSingleTenant(): boolean {
  return AUTH_MODE === 'single-tenant';
}

/**
 * Check if multi-tenant mode
 */
export function isMultiTenant(): boolean {
  return AUTH_MODE === 'multi-tenant';
}

/**
 * Check if organizations should be visible to users
 */
export function shouldShowOrgs(): boolean {
  return isMultiTenant();
}

/**
 * Get or create the default organization for single-tenant mode
 *
 * Note: This function imports database dependencies lazily to avoid
 * issues in Edge runtime environments (like middleware)
 */
export async function getOrCreateDefaultOrg() {
  if (!isSingleTenant()) {
    throw new Error('getOrCreateDefaultOrg should only be called in single-tenant mode');
  }

  // Lazy import to avoid Edge runtime issues
  const { db } = await import('./db');
  const { organization } = await import('@/permissions-schema');
  const { eq } = await import('drizzle-orm');

  // Check if default org exists
  const existing = await db
    .select()
    .from(organization)
    .where(eq(organization.id, SINGLE_TENANT_ORG_ID))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create default org
  const newOrg = await db
    .insert(organization)
    .values({
      id: SINGLE_TENANT_ORG_ID,
      name: SINGLE_TENANT_ORG_NAME,
      slug: 'default',
      createdAt: new Date(),
    })
    .returning();

  return newOrg[0];
}
