import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-auth";
import {
  createRole,
  getInterfaceRoles,
} from "@/lib/permissions";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { roles } from "@/permissions-schema";

// GET /api/admin/roles - List all roles for the interface
export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const session = await auth.api.getSession({
      headers: request.headers,
    });

    const interfaceId = session.user.interfaceId || process.env.INTERFACE_ID || "unknown";

    const interfaceRoles = await getInterfaceRoles(interfaceId);

    return NextResponse.json({ roles: interfaceRoles });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/roles - Create a new role
export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const session = await auth.api.getSession({
      headers: request.headers,
    });

    const body = await request.json();
    const { name, description, isDefault } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Role name is required" },
        { status: 400 }
      );
    }

    const interfaceId = session.user.interfaceId || process.env.INTERFACE_ID || "unknown";

    await createRole({
      id: crypto.randomUUID(),
      name,
      description,
      interfaceId,
      isDefault,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/roles/:id - Update a role
export async function PUT(request: NextRequest) {
  try {
    // Check admin access
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const body = await request.json();
    const { id, name, description, isDefault } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Role ID is required" },
        { status: 400 }
      );
    }

    await db
      .update(roles)
      .set({
        name,
        description,
        isDefault,
        updatedAt: new Date(),
      })
      .where(eq(roles.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/roles/:id - Delete a role
export async function DELETE(request: NextRequest) {
  try {
    // Check admin access
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Role ID is required" },
        { status: 400 }
      );
    }

    await db.delete(roles).where(eq(roles.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
