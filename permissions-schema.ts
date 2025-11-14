import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";

// Organizations table - customer organizations for multi-tenant interfaces
export const organizations = sqliteTable("system.interface_organizations", {
  id: text("id").primaryKey(),
  interfaceId: text("interface_id").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(), // unique identifier for the org
  allowDomainSignup: integer("allow_domain_signup", { mode: "boolean" })
    .default(false)
    .notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
});

// Roles table - custom roles per interface
export const roles = sqliteTable("system.interface_roles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  interfaceId: text("interface_id").notNull(),
  isDefault: integer("is_default", { mode: "boolean" })
    .default(false)
    .notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
});

// Page/route permissions - which roles can access which pages
export const pagePermissions = sqliteTable("system.interface_page_permissions", {
  id: text("id").primaryKey(),
  roleId: text("role_id")
    .notNull()
    .references(() => roles.id, { onDelete: "cascade" }),
  routePattern: text("route_pattern").notNull(), // e.g., "/dashboard", "/admin/*"
  canAccess: integer("can_access", { mode: "boolean" })
    .default(true)
    .notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

// Data source filters - control what data users can see
export const dataPermissions = sqliteTable("system.interface_data_permissions", {
  id: text("id").primaryKey(),
  roleId: text("role_id")
    .notNull()
    .references(() => roles.id, { onDelete: "cascade" }),
  routePattern: text("route_pattern").notNull(), // which page this applies to
  dataSourceType: text("data_source_type").notNull(), // "table", "kv", "knowledge"
  dataSourceName: text("data_source_name").notNull(), // table name, KV namespace, etc.
  filterConfig: text("filter_config", { mode: "json" }).notNull().$type<FilterConfig>(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

// Type definitions for filter configuration
export type FilterOperator =
  | "equals"
  | "not_equals"
  | "in"
  | "not_in"
  | "contains"
  | "not_contains"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "is_null"
  | "is_not_null";

export type FilterCondition = {
  field: string;
  operator: FilterOperator;
  value: string | number | boolean | string[] | null;
};

export type FilterConfig = {
  conditions: FilterCondition[];
  logic: "AND" | "OR"; // how to combine multiple conditions
};
