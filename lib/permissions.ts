import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { roles, pagePermissions } from "@/permissions-schema";
import { user } from "@/auth-schema";

/**
 * Check if a user has access to a specific route
 */
export async function userCanAccessRoute(
  userId: string,
  route: string
): Promise<boolean> {
  try {
    // Get user's role
    const userData = await db.query.user.findFirst({
      where: eq(user.id, userId),
      columns: {
        roleId: true,
      },
    });

    if (!userData?.roleId) {
      // No role assigned - deny access by default
      return false;
    }

    // Check for exact route match first
    const exactMatch = await db.query.pagePermissions.findFirst({
      where: and(
        eq(pagePermissions.roleId, userData.roleId),
        eq(pagePermissions.routePattern, route)
      ),
    });

    if (exactMatch) {
      return exactMatch.canAccess;
    }

    // Check for wildcard matches
    const wildcardPermissions = await db.query.pagePermissions.findMany({
      where: eq(pagePermissions.roleId, userData.roleId),
    });

    for (const permission of wildcardPermissions) {
      if (matchesRoutePattern(route, permission.routePattern)) {
        return permission.canAccess;
      }
    }

    // No permission found - deny by default
    return false;
  } catch (error) {
    console.error("Error checking route access:", error);
    return false;
  }
}

/**
 * Get user's role information
 */
export async function getUserRole(userId: string) {
  const userData = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: {
      roleId: true,
    },
  });

  if (!userData?.roleId) {
    return null;
  }

  return await db.query.roles.findFirst({
    where: eq(roles.id, userData.roleId),
  });
}

/**
 * Check if a route matches a pattern (supports wildcards)
 * Examples:
 *   /dashboard matches /dashboard
 *   /dashboard/settings matches /dashboard/*
 *   /admin/users/123 matches /admin/**
 */
function matchesRoutePattern(route: string, pattern: string): boolean {
  // Exact match
  if (route === pattern) {
    return true;
  }

  // Wildcard patterns
  if (pattern.endsWith("/*")) {
    // Single level wildcard: /admin/* matches /admin/users but not /admin/users/123
    const basePattern = pattern.slice(0, -2);
    const routeParts = route.split("/");
    const patternParts = basePattern.split("/");

    if (routeParts.length !== patternParts.length + 1) {
      return false;
    }

    return route.startsWith(basePattern + "/");
  }

  if (pattern.endsWith("/**")) {
    // Multi-level wildcard: /admin/** matches /admin/users and /admin/users/123
    const basePattern = pattern.slice(0, -3);
    return route.startsWith(basePattern + "/");
  }

  return false;
}

/**
 * Get all roles for an interface
 */
export async function getInterfaceRoles(interfaceId: string) {
  return await db.query.roles.findMany({
    where: eq(roles.interfaceId, interfaceId),
    orderBy: (roles, { asc }) => [asc(roles.name)],
  });
}

/**
 * Get all page permissions for a role
 */
export async function getRolePagePermissions(roleId: string) {
  return await db.query.pagePermissions.findMany({
    where: eq(pagePermissions.roleId, roleId),
    orderBy: (pagePermissions, { asc }) => [asc(pagePermissions.routePattern)],
  });
}

/**
 * Create a new role
 */
export async function createRole(data: {
  id: string;
  name: string;
  description?: string;
  interfaceId: string;
  isDefault?: boolean;
}) {
  return await db.insert(roles).values({
    id: data.id,
    name: data.name,
    description: data.description,
    interfaceId: data.interfaceId,
    isDefault: data.isDefault || false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

/**
 * Grant page access to a role
 */
export async function grantPageAccess(data: {
  id: string;
  roleId: string;
  routePattern: string;
  canAccess?: boolean;
}) {
  return await db.insert(pagePermissions).values({
    id: data.id,
    roleId: data.roleId,
    routePattern: data.routePattern,
    canAccess: data.canAccess ?? true,
    createdAt: new Date(),
  });
}

/**
 * Revoke page access from a role
 */
export async function revokePageAccess(permissionId: string) {
  return await db
    .delete(pagePermissions)
    .where(eq(pagePermissions.id, permissionId));
}

/**
 * Assign a role to a user
 */
export async function assignRoleToUser(userId: string, roleId: string) {
  return await db
    .update(user)
    .set({ roleId })
    .where(eq(user.id, userId));
}

/**
 * Check if a user is an admin (has a role named "Admin")
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role?.name === "Admin";
}

/**
 * Get default role for an interface (the role with isDefault = true)
 */
export async function getDefaultRole(interfaceId: string) {
  return await db.query.roles.findFirst({
    where: and(
      eq(roles.interfaceId, interfaceId),
      eq(roles.isDefault, true)
    ),
  });
}
