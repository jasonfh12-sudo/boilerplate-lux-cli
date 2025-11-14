import { db } from "@/lib/db";
import { roles, pagePermissions } from "@/permissions-schema";
import { eq, and } from "drizzle-orm";

/**
 * Seeds default "Admin" and "User" roles for an interface
 *
 * Admin role:
 * - Can access everything including /admin/* routes
 * - Can invite/manage users
 * - Can manage roles and permissions
 *
 * User role:
 * - Can access normal app routes
 * - Cannot access /admin/* routes
 */
export async function seedDefaultRoles(interfaceId: string) {
  console.log(`Seeding default roles for interface: ${interfaceId}`);

  // Check if roles already exist
  const existingRoles = await db.query.roles.findMany({
    where: eq(roles.interfaceId, interfaceId),
  });

  if (existingRoles.length > 0) {
    console.log("Roles already exist for this interface, skipping seed");
    return;
  }

  const adminRoleId = crypto.randomUUID();
  const userRoleId = crypto.randomUUID();

  // Create Admin role
  await db.insert(roles).values({
    id: adminRoleId,
    name: "Admin",
    description: "Full access to all features including user and role management",
    interfaceId,
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Create User role (default)
  await db.insert(roles).values({
    id: userRoleId,
    name: "User",
    description: "Standard user access without admin privileges",
    interfaceId,
    isDefault: true, // This is the default role for new users
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Admin permissions - access to everything (pages + APIs)
  await db.insert(pagePermissions).values([
    // Page permissions
    {
      id: crypto.randomUUID(),
      roleId: adminRoleId,
      routePattern: "/admin/**", // All admin pages
      canAccess: true,
      createdAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      roleId: adminRoleId,
      routePattern: "/dashboard/**", // All dashboard pages
      canAccess: true,
      createdAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      roleId: adminRoleId,
      routePattern: "/", // Root and all other pages
      canAccess: true,
      createdAt: new Date(),
    },
    // API permissions
    {
      id: crypto.randomUUID(),
      roleId: adminRoleId,
      routePattern: "/api/admin/**", // All admin API routes
      canAccess: true,
      createdAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      roleId: adminRoleId,
      routePattern: "/api/**", // All other API routes
      canAccess: true,
      createdAt: new Date(),
    },
  ]);

  // User permissions - access to everything EXCEPT admin routes (pages + APIs)
  await db.insert(pagePermissions).values([
    // Page permissions
    {
      id: crypto.randomUUID(),
      roleId: userRoleId,
      routePattern: "/admin/**", // Deny admin pages
      canAccess: false,
      createdAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      roleId: userRoleId,
      routePattern: "/dashboard/**", // Allow dashboard
      canAccess: true,
      createdAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      roleId: userRoleId,
      routePattern: "/", // Allow root and other pages
      canAccess: true,
      createdAt: new Date(),
    },
    // API permissions
    {
      id: crypto.randomUUID(),
      roleId: userRoleId,
      routePattern: "/api/admin/**", // Deny admin API routes
      canAccess: false,
      createdAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      roleId: userRoleId,
      routePattern: "/api/**", // Allow other API routes
      canAccess: true,
      createdAt: new Date(),
    },
  ]);

  console.log("✅ Default roles seeded successfully");
  console.log(`  - Admin role ID: ${adminRoleId}`);
  console.log(`  - User role ID: ${userRoleId}`);
}

// If run directly
if (require.main === module) {
  const interfaceId = process.env.INTERFACE_ID || process.argv[2];

  if (!interfaceId) {
    console.error("Please provide an interface ID:");
    console.error("  npm run seed-roles <interface-id>");
    console.error("  or set INTERFACE_ID environment variable");
    process.exit(1);
  }

  seedDefaultRoles(interfaceId)
    .then(() => {
      console.log("Done!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Error seeding roles:", error);
      process.exit(1);
    });
}
