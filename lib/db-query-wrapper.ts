import { db } from "./db";
import { eq, and, SQL } from "drizzle-orm";
import { dataPermissions } from "@/permissions-schema";
import { user } from "@/auth-schema";
import { buildWhereClause, type FilterContext } from "./permission-filters";

/**
 * Get data filters for a user on a specific route and data source
 */
export async function getDataFilters(params: {
  userId: string;
  route: string;
  dataSourceType: "table" | "kv" | "knowledge";
  dataSourceName: string;
}): Promise<SQL | null> {
  try {
    // Get user's role
    const userData = await db.query.user.findFirst({
      where: eq(user.id, params.userId),
      columns: {
        roleId: true,
        email: true,
        name: true,
        interfaceId: true,
      },
    });

    if (!userData?.roleId) {
      // No role - deny all data access
      return null;
    }

    // Find applicable data permission
    const permission = await db.query.dataPermissions.findFirst({
      where: and(
        eq(dataPermissions.roleId, userData.roleId),
        eq(dataPermissions.routePattern, params.route),
        eq(dataPermissions.dataSourceType, params.dataSourceType),
        eq(dataPermissions.dataSourceName, params.dataSourceName)
      ),
    });

    if (!permission) {
      // No permission configured - deny all data access
      return null;
    }

    // Build filter context
    const context: FilterContext = {
      current_user_id: params.userId,
      interface_id: userData.interfaceId || "",
      user_email: userData.email,
      user_name: userData.name,
    };

    // Build WHERE clause from filter config
    return buildWhereClause(permission.filterConfig, context);
  } catch (error) {
    console.error("Error getting data filters:", error);
    return null;
  }
}

/**
 * Wrapper for database queries that automatically applies role-based filters
 *
 * Usage example:
 * ```ts
 * const projects = await withDataFilters({
 *   userId: session.user.id,
 *   route: "/dashboard",
 *   dataSourceType: "table",
 *   dataSourceName: "projects",
 *   query: async (filters) => {
 *     return db.query.projects.findMany({
 *       where: filters,
 *     });
 *   },
 * });
 * ```
 */
export async function withDataFilters<T>(params: {
  userId: string;
  route: string;
  dataSourceType: "table" | "kv" | "knowledge";
  dataSourceName: string;
  query: (filters: SQL | null) => Promise<T>;
}): Promise<T> {
  const filters = await getDataFilters({
    userId: params.userId,
    route: params.route,
    dataSourceType: params.dataSourceType,
    dataSourceName: params.dataSourceName,
  });

  return await params.query(filters);
}

/**
 * Helper function to create a filter-aware query builder
 *
 * Usage example:
 * ```ts
 * const queryBuilder = createFilteredQueryBuilder({
 *   userId: session.user.id,
 *   route: "/dashboard",
 * });
 *
 * const projects = await queryBuilder.table("projects", async (filters) => {
 *   return db.query.projects.findMany({ where: filters });
 * });
 * ```
 */
export function createFilteredQueryBuilder(params: {
  userId: string;
  route: string;
}) {
  return {
    table: async <T>(
      tableName: string,
      query: (filters: SQL | null) => Promise<T>
    ) => {
      return withDataFilters({
        userId: params.userId,
        route: params.route,
        dataSourceType: "table",
        dataSourceName: tableName,
        query,
      });
    },

    kv: async <T>(
      namespace: string,
      query: (filters: SQL | null) => Promise<T>
    ) => {
      return withDataFilters({
        userId: params.userId,
        route: params.route,
        dataSourceType: "kv",
        dataSourceName: namespace,
        query,
      });
    },

    knowledge: async <T>(
      storeName: string,
      query: (filters: SQL | null) => Promise<T>
    ) => {
      return withDataFilters({
        userId: params.userId,
        route: params.route,
        dataSourceType: "knowledge",
        dataSourceName: storeName,
        query,
      });
    },
  };
}

/**
 * Check if a user has ANY data access for a specific data source on a route
 * (useful for showing/hiding UI elements)
 */
export async function hasDataAccess(params: {
  userId: string;
  route: string;
  dataSourceType: "table" | "kv" | "knowledge";
  dataSourceName: string;
}): Promise<boolean> {
  const filters = await getDataFilters(params);
  return filters !== null;
}
