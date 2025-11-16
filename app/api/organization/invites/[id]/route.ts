import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { invitation } from "@/permissions-schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user's active organization
    const activeOrg = session.session.activeOrganizationId;

    if (!activeOrg) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 }
      );
    }

    const inviteId = params.id;

    // Delete the invitation (only if it belongs to the active org)
    const result = await db
      .delete(invitation)
      .where(
        and(
          eq(invitation.id, inviteId),
          eq(invitation.organizationId, activeOrg)
        )
      );

    return NextResponse.json({
      success: true,
      message: "Invitation cancelled",
    });
  } catch (error: any) {
    console.error("[DELETE-INVITE] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel invitation" },
      { status: 500 }
    );
  }
}
