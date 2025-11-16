import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { member as memberTable } from "@/permissions-schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
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

    const { memberId } = await params;

    // Get current user's role
    const currentUserMember = await db
      .select()
      .from(memberTable)
      .where(
        and(
          eq(memberTable.userId, session.user.id),
          eq(memberTable.organizationId, activeOrg)
        )
      )
      .limit(1);

    if (currentUserMember.length === 0) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 }
      );
    }

    // Only owners can remove members
    if (currentUserMember[0].role !== "owner") {
      return NextResponse.json(
        { error: "Only owners can remove members" },
        { status: 403 }
      );
    }

    // Get the member to be removed
    const memberToRemove = await db
      .select()
      .from(memberTable)
      .where(
        and(
          eq(memberTable.id, memberId),
          eq(memberTable.organizationId, activeOrg)
        )
      )
      .limit(1);

    if (memberToRemove.length === 0) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // Cannot remove owners
    if (memberToRemove[0].role === "owner") {
      return NextResponse.json(
        { error: "Cannot remove owners from the organization" },
        { status: 403 }
      );
    }

    // Cannot remove yourself
    if (memberToRemove[0].userId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot remove yourself from the organization" },
        { status: 403 }
      );
    }

    // Remove the member
    await db
      .delete(memberTable)
      .where(eq(memberTable.id, memberId));

    console.log("[REMOVE-MEMBER] Member removed:", {
      memberId,
      removedBy: session.user.id,
      organizationId: activeOrg,
    });

    return NextResponse.json({
      success: true,
      message: "Member removed successfully",
    });
  } catch (error: any) {
    console.error("[REMOVE-MEMBER] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove member" },
      { status: 500 }
    );
  }
}
