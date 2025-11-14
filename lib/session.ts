import { headers } from "next/headers";
import { auth } from "./auth";

/**
 * Session Context Interface
 * Contains user and organization information from the session
 */
export interface SessionContext {
  userId: string;
  organizationId: string | null;
  roleId: string | null;
  interfaceId: string;
}

/**
 * Get session context for API routes
 *
 * This function retrieves the authenticated user's session context,
 * including organizationId which is critical for multi-tenant data isolation.
 *
 * Usage in API routes:
 * ```ts
 * import { getSessionContext } from "@/lib/session";
 *
 * export async function GET(req: Request) {
 *   const session = await getSessionContext();
 *   if (!session) {
 *     return new Response("Unauthorized", { status: 401 });
 *   }
 *
 *   // Now you have access to session.organizationId for scoping queries
 *   const data = await db.query.yourTable.findMany({
 *     where: eq(yourTable.organizationId, session.organizationId)
 *   });
 * }
 * ```
 *
 * @returns SessionContext or null if not authenticated
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  try {
    // Get session from Better Auth
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return null;
    }

    return {
      userId: session.user.id,
      organizationId: session.session?.organizationId || null,
      roleId: session.session?.roleId || null,
      interfaceId: session.session?.interfaceId || process.env.INTERFACE_ID || "unknown",
    };
  } catch (error) {
    console.error("Error getting session context:", error);
    return null;
  }
}

/**
 * Require session context or throw error
 *
 * Use this when you want to ensure a session exists and throw 401 if not.
 *
 * Usage:
 * ```ts
 * export async function GET(req: Request) {
 *   const session = await requireSessionContext();
 *   // No need to check for null, will throw if not authenticated
 *   const data = await db.query.yourTable.findMany({
 *     where: eq(yourTable.organizationId, session.organizationId)
 *   });
 * }
 * ```
 *
 * @throws Response with 401 status if not authenticated
 * @returns SessionContext
 */
export async function requireSessionContext(): Promise<SessionContext> {
  const session = await getSessionContext();

  if (!session) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return session;
}

/**
 * Require organization context or throw error
 *
 * Use this in multi-tenant interfaces to ensure the user belongs to an organization.
 * This is critical for data isolation - users without an organizationId should not
 * be able to access multi-tenant data.
 *
 * Usage:
 * ```ts
 * export async function GET(req: Request) {
 *   const session = await requireOrganizationContext();
 *   // session.organizationId is guaranteed to be non-null
 *   const data = await db.query.yourTable.findMany({
 *     where: eq(yourTable.organizationId, session.organizationId)
 *   });
 * }
 * ```
 *
 * @throws Response with 403 status if user has no organizationId
 * @returns SessionContext with guaranteed non-null organizationId
 */
export async function requireOrganizationContext(): Promise<Required<SessionContext>> {
  const session = await requireSessionContext();

  if (!session.organizationId) {
    throw new Response(
      "Access denied: No organization associated with this user",
      { status: 403 }
    );
  }

  return session as Required<SessionContext>;
}

/**
 * Get organizationId from request headers
 *
 * This is injected by middleware for convenience.
 * Prefer using getSessionContext() for full session data.
 *
 * @returns organizationId or null
 */
export async function getOrganizationIdFromHeaders(): Promise<string | null> {
  const headersList = await headers();
  return headersList.get("x-organization-id");
}

/**
 * Validate organization access
 *
 * Checks if the current user's organizationId matches the provided organizationId.
 * Use this when accepting organizationId as a parameter to prevent cross-org access.
 *
 * Usage:
 * ```ts
 * export async function GET(req: Request, { params }: { params: { orgId: string } }) {
 *   await validateOrganizationAccess(params.orgId);
 *   // User is authorized to access this org's data
 * }
 * ```
 *
 * @param organizationId - The organization ID to validate against
 * @throws Response with 403 status if organizationId doesn't match session
 */
export async function validateOrganizationAccess(
  organizationId: string
): Promise<void> {
  const session = await requireOrganizationContext();

  if (session.organizationId !== organizationId) {
    throw new Response(
      "Access denied: You do not have permission to access this organization's data",
      { status: 403 }
    );
  }
}
