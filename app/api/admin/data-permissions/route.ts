import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { dataPermissions } from "@/permissions-schema";

// GET /api/admin/data-permissions?roleId=xxx - Get data permissions for a role
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

    const permissions = await db.query.dataPermissions.findMany({
      where: eq(dataPermissions.roleId, roleId),
    });

    return NextResponse.json({ permissions });
  } catch (error) {
    console.error("Error fetching data permissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/data-permissions - Create data permission
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
    const { roleId, routePattern, dataSourceType, dataSourceName, filterConfig } = body;

    if (!roleId || !routePattern || !dataSourceType || !dataSourceName || !filterConfig) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    await db.insert(dataPermissions).values({
      id: crypto.randomUUID(),
      roleId,
      routePattern,
      dataSourceType,
      dataSourceName,
      filterConfig,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating data permission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/data-permissions?id=xxx - Delete data permission
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

    await db.delete(dataPermissions).where(eq(dataPermissions.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting data permission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
