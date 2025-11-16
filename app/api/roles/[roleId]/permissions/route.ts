import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { pagePermissions } from "@/permissions-schema";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/roles/[roleId]/permissions
 * Add or update a permission for a role
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { roleId: string } }
) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { routePattern, canAccess } = body;

    if (!routePattern) {
      return NextResponse.json(
        { error: "Route pattern is required" },
        { status: 400 }
      );
    }

    const roleId = params.roleId;

    // Check if permission already exists
    const existing = await db.query.pagePermissions.findFirst({
      where: and(
        eq(pagePermissions.roleId, roleId),
        eq(pagePermissions.routePattern, routePattern)
      ),
    });

    if (existing) {
      // Update existing permission
      await db
        .update(pagePermissions)
        .set({ canAccess: canAccess ?? true })
        .where(eq(pagePermissions.id, existing.id));

      return NextResponse.json({
        success: true,
        message: "Permission updated successfully",
      });
    } else {
      // Create new permission
      await db.insert(pagePermissions).values({
        id: crypto.randomUUID(),
        roleId,
        routePattern,
        canAccess: canAccess ?? true,
        createdAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: "Permission added successfully",
      });
    }
  } catch (error: any) {
    console.error("[PERMISSIONS API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update permission" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/roles/[roleId]/permissions
 * Remove a permission from a role
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { roleId: string } }
) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const routePattern = searchParams.get("routePattern");

    if (!routePattern) {
      return NextResponse.json(
        { error: "Route pattern is required" },
        { status: 400 }
      );
    }

    const roleId = params.roleId;

    // Delete the permission
    await db
      .delete(pagePermissions)
      .where(
        and(
          eq(pagePermissions.roleId, roleId),
          eq(pagePermissions.routePattern, routePattern)
        )
      );

    return NextResponse.json({
      success: true,
      message: "Permission removed successfully",
    });
  } catch (error: any) {
    console.error("[PERMISSIONS API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove permission" },
      { status: 500 }
    );
  }
}
