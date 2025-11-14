import { sql, SQL } from "drizzle-orm";
import type { FilterConfig, FilterCondition, FilterOperator } from "@/permissions-schema";

/**
 * Template variable context for filter values
 */
export type FilterContext = {
  current_user_id: string;
  interface_id: string;
  user_email?: string;
  user_name?: string;
  [key: string]: string | number | boolean | undefined;
};

/**
 * Replace template variables in a value
 * Examples:
 *   "{{current_user_id}}" → actual user ID
 *   "{{interface_id}}" → actual interface ID
 */
export function replaceTemplateVariables(
  value: any,
  context: FilterContext
): any {
  if (typeof value !== "string") {
    return value;
  }

  // Check if it's a template variable
  const templateMatch = value.match(/^\{\{(.+)\}\}$/);
  if (!templateMatch) {
    return value;
  }

  const varName = templateMatch[1].trim();
  return context[varName] ?? value;
}

/**
 * Build a SQL WHERE clause from filter conditions
 */
export function buildWhereClause(
  filterConfig: FilterConfig,
  context: FilterContext,
  tableName?: string
): SQL {
  const { conditions, logic } = filterConfig;

  if (conditions.length === 0) {
    // No conditions - allow all
    return sql`1 = 1`;
  }

  const sqlConditions = conditions.map((condition) =>
    buildConditionSQL(condition, context, tableName)
  );

  if (logic === "OR") {
    return sql.join(sqlConditions, sql.raw(" OR "));
  } else {
    return sql.join(sqlConditions, sql.raw(" AND "));
  }
}

/**
 * Build SQL for a single filter condition
 */
function buildConditionSQL(
  condition: FilterCondition,
  context: FilterContext,
  tableName?: string
): SQL {
  const { field, operator, value } = condition;

  // Resolve template variables
  const resolvedValue = replaceTemplateVariables(value, context);

  // Build field reference (with optional table prefix)
  const fieldRef = tableName ? sql.raw(`${tableName}.${field}`) : sql.raw(field);

  switch (operator) {
    case "equals":
      return sql`${fieldRef} = ${resolvedValue}`;

    case "not_equals":
      return sql`${fieldRef} != ${resolvedValue}`;

    case "gt":
      return sql`${fieldRef} > ${resolvedValue}`;

    case "gte":
      return sql`${fieldRef} >= ${resolvedValue}`;

    case "lt":
      return sql`${fieldRef} < ${resolvedValue}`;

    case "lte":
      return sql`${fieldRef} <= ${resolvedValue}`;

    case "contains":
      return sql`${fieldRef} LIKE ${"%" + resolvedValue + "%"}`;

    case "not_contains":
      return sql`${fieldRef} NOT LIKE ${"%" + resolvedValue + "%"}`;

    case "in":
      if (!Array.isArray(resolvedValue)) {
        throw new Error("IN operator requires array value");
      }
      return sql`${fieldRef} IN ${resolvedValue}`;

    case "not_in":
      if (!Array.isArray(resolvedValue)) {
        throw new Error("NOT IN operator requires array value");
      }
      return sql`${fieldRef} NOT IN ${resolvedValue}`;

    case "is_null":
      return sql`${fieldRef} IS NULL`;

    case "is_not_null":
      return sql`${fieldRef} IS NOT NULL`;

    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
}

/**
 * Validate filter configuration
 */
export function validateFilterConfig(config: FilterConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.conditions || !Array.isArray(config.conditions)) {
    errors.push("Filter config must have 'conditions' array");
  }

  if (!config.logic || !["AND", "OR"].includes(config.logic)) {
    errors.push("Filter config must have 'logic' of 'AND' or 'OR'");
  }

  config.conditions?.forEach((condition, index) => {
    if (!condition.field) {
      errors.push(`Condition ${index}: missing 'field'`);
    }

    if (!condition.operator) {
      errors.push(`Condition ${index}: missing 'operator'`);
    }

    const validOperators: FilterOperator[] = [
      "equals",
      "not_equals",
      "in",
      "not_in",
      "contains",
      "not_contains",
      "gt",
      "gte",
      "lt",
      "lte",
      "is_null",
      "is_not_null",
    ];

    if (condition.operator && !validOperators.includes(condition.operator)) {
      errors.push(
        `Condition ${index}: invalid operator '${condition.operator}'`
      );
    }

    // Check value requirements
    if (
      condition.operator &&
      !["is_null", "is_not_null"].includes(condition.operator) &&
      condition.value === undefined
    ) {
      errors.push(`Condition ${index}: missing 'value'`);
    }

    if (
      condition.operator &&
      ["in", "not_in"].includes(condition.operator) &&
      !Array.isArray(condition.value)
    ) {
      errors.push(
        `Condition ${index}: operator '${condition.operator}' requires array value`
      );
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a simple filter config for common use cases
 */
export function createSimpleFilter(
  field: string,
  operator: FilterOperator,
  value: any
): FilterConfig {
  return {
    conditions: [
      {
        field,
        operator,
        value,
      },
    ],
    logic: "AND",
  };
}

/**
 * Example filter configurations
 */
export const filterExamples = {
  // Only show user's own records
  ownRecordsOnly: createSimpleFilter("user_id", "equals", "{{current_user_id}}"),

  // Only show records for the interface
  interfaceRecordsOnly: createSimpleFilter(
    "interface_id",
    "equals",
    "{{interface_id}}"
  ),

  // Show active records only
  activeRecordsOnly: createSimpleFilter("status", "equals", "active"),

  // Combine multiple filters
  ownActiveRecords: {
    conditions: [
      { field: "user_id", operator: "equals" as const, value: "{{current_user_id}}" },
      { field: "status", operator: "equals" as const, value: "active" },
    ],
    logic: "AND" as const,
  },
};
