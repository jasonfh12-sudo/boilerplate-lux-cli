import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") });

import { db } from "../lib/db";
import { roles, pagePermissions } from "../permissions-schema";
import { eq, and } from "drizzle-orm";

const INTERFACE_ID = process.env.INTERFACE_ID || "unknown";

/**
 * Setup default roles and permissions for the interface
 * Creates 3 roles: owner, admin, member with different access levels
 */
async function setupDefaultRoles() {
  console.log(`\n= Setting up default roles for interface: ${INTERFACE_ID}\n`);

  // Define default roles with their permissions
  const defaultRoles = [
    {
      name: "owner",
      description: "Full access to all features and settings",
      isDefault: false,
      routes: ["/**"], // Owner has access to everything
    },
    {
      name: "admin",
      description: "Administrative access with some restrictions",
      isDefault: false,
      routes: [
        "/",
        "/settings",
        "/integrations",
        "/examples/**",
        "/auth/**",
      ],
    },
    {
      name: "member",
      description: "Basic member access",
      isDefault: true, // Default role for new members
      routes: [
        "/",
        "/examples/**",
        "/auth/**",
      ],
    },
  ];

  for (const roleData of defaultRoles) {
    try {
      // Check if role already exists
      const existingRole = await db.query.roles.findFirst({
        where: and(
          eq(roles.name, roleData.name),
          eq(roles.interfaceId, INTERFACE_ID)
        ),
      });

      let roleId: string;

      if (existingRole) {
        console.log(` Role "${roleData.name}" already exists`);
        roleId = existingRole.id;
      } else {
        // Create the role
        roleId = crypto.randomUUID();
        await db.insert(roles).values({
          id: roleId,
          name: roleData.name,
          description: roleData.description,
          interfaceId: INTERFACE_ID,
          isDefault: roleData.isDefault,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(` Created role: ${roleData.name}`);
      }

      // Setup permissions for this role
      for (const routePattern of roleData.routes) {
        // Check if permission already exists
        const existingPermission = await db.query.pagePermissions.findFirst({
          where: and(
            eq(pagePermissions.roleId, roleId),
            eq(pagePermissions.routePattern, routePattern)
          ),
        });

        if (!existingPermission) {
          await db.insert(pagePermissions).values({
            id: crypto.randomUUID(),
            roleId,
            routePattern,
            canAccess: true,
            createdAt: new Date(),
          });
          console.log(`  - Granted access to: ${routePattern}`);
        }
      }
    } catch (error) {
      console.error(` Error setting up role "${roleData.name}":`, error);
    }
  }

  console.log(`\n Default roles setup complete!\n`);
}

// Run the setup
setupDefaultRoles()
  .then(() => {
    console.log("Setup finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Setup failed:", error);
    process.exit(1);
  });
