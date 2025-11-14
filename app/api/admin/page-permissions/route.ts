import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  grantPageAccess,
  revokePageAccess,
  getRolePagePermissions,
} from "@/lib/permissions";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { pagePermissions } from "@/permissions-schema";

// GET /api/admin/page-permissions?roleId=xxx - Get page permissions for a role
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get("roleId");

    if (!roleId) {
      return NextResponse.json(
        { error: "Role ID is required" },
        { status: 400 }
      );
    }

    const permissions = await getRolePagePermissions(roleId);

    return NextResponse.json({ permissions });
  } catch (error) {
    console.error("Error fetching page permissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/page-permissions - Grant page access to a role
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { roleId, routePattern, canAccess } = body;

    if (!roleId || !routePattern) {
      return NextResponse.json(
        { error: "Role ID and route pattern are required" },
        { status: 400 }
      );
    }

    await grantPageAccess({
      id: crypto.randomUUID(),
      roleId,
      routePattern,
      canAccess,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error granting page access:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/page-permissions - Update page permission
export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, canAccess } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Permission ID is required" },
        { status: 400 }
      );
    }

    await db
      .update(pagePermissions)
      .set({ canAccess })
      .where(eq(pagePermissions.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating page permission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/page-permissions?id=xxx - Revoke page access
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Permission ID is required" },
        { status: 400 }
      );
    }

    await revokePageAccess(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error revoking page access:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
