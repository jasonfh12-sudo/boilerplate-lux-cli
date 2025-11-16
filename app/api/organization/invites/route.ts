import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { invitation } from "@/permissions-schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
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

    // Fetch pending invitations only
    const invitations = await db
      .select()
      .from(invitation)
      .where(
        and(
          eq(invitation.organizationId, activeOrg),
          eq(invitation.status, "pending")
        )
      );

    return NextResponse.json({
      invitations: invitations.map((inv) => ({
        ...inv,
        createdAt: inv.createdAt?.toISOString(),
        expiresAt: inv.expiresAt?.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error("[INVITES] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch invitations" },
      { status: 500 }
    );
  }
}
