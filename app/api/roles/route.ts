import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { roles, pagePermissions } from "@/permissions-schema";
import { eq } from "drizzle-orm";

const INTERFACE_ID = process.env.INTERFACE_ID || "unknown";

/**
 * GET /api/roles
 * Get all roles with their permissions for the current interface
 */
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all roles for this interface
    const allRoles = await db.query.roles.findMany({
      where: eq(roles.interfaceId, INTERFACE_ID),
      orderBy: (roles, { asc }) => [asc(roles.name)],
    });

    // Get permissions for each role
    const rolesWithPermissions = await Promise.all(
      allRoles.map(async (role) => {
        const permissions = await db.query.pagePermissions.findMany({
          where: eq(pagePermissions.roleId, role.id),
          orderBy: (pagePermissions, { asc }) => [
            asc(pagePermissions.routePattern),
          ],
        });

        return {
          ...role,
          permissions,
        };
      })
    );

    return NextResponse.json({
      roles: rolesWithPermissions,
    });
  } catch (error: any) {
    console.error("[ROLES API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch roles" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/roles
 * Create a new role
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, isDefault, routePatterns } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Role name is required" },
        { status: 400 }
      );
    }

    // Check if role already exists
    const existing = await db.query.roles.findFirst({
      where: eq(roles.name, name),
    });

    if (existing) {
      return NextResponse.json(
        { error: "Role with this name already exists" },
        { status: 400 }
      );
    }

    // Create the role
    const roleId = crypto.randomUUID();
    await db.insert(roles).values({
      id: roleId,
      name,
      description,
      interfaceId: INTERFACE_ID,
      isDefault: isDefault || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create permissions if provided
    if (routePatterns && Array.isArray(routePatterns)) {
      for (const pattern of routePatterns) {
        await db.insert(pagePermissions).values({
          id: crypto.randomUUID(),
          roleId,
          routePattern: pattern,
          canAccess: true,
          createdAt: new Date(),
        });
      }
    }

    return NextResponse.json({
      success: true,
      roleId,
      message: "Role created successfully",
    });
  } catch (error: any) {
    console.error("[ROLES API] Error creating role:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create role" },
      { status: 500 }
    );
  }
}
