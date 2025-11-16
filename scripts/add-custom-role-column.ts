import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { db } from "../lib/db";
import { sql } from "drizzle-orm";

/**
 * Add custom_role_id column to member table
 * Run with: npx tsx scripts/add-custom-role-column.ts
 */
async function addCustomRoleColumn() {
  try {
    console.log("Adding custom_role_id column to member table...");

    // Add the column
    await db.run(sql`
      ALTER TABLE "system.interface_member" ADD COLUMN custom_role_id TEXT;
    `);

    console.log("Successfully added custom_role_id column!");
  } catch (error: any) {
    if (error.message?.includes("duplicate column")) {
      console.log("Column already exists, skipping migration.");
    } else {
      console.error("Error adding column:", error);
      process.exit(1);
    }
  }
}

addCustomRoleColumn();
