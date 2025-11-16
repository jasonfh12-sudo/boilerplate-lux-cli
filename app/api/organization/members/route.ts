import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { member as memberTable } from "@/permissions-schema";
import { user as userTable } from "@/auth-schema";
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

    // Get current user's role in the organization
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

    const currentUserRole = currentUserMember.length > 0 ? currentUserMember[0].role : null;

    // Fetch members with user details
    const members = await db
      .select({
        id: memberTable.id,
        userId: memberTable.userId,
        organizationId: memberTable.organizationId,
        role: memberTable.role,
        createdAt: memberTable.createdAt,
        user: {
          id: userTable.id,
          email: userTable.email,
          name: userTable.name,
          image: userTable.image,
        },
      })
      .from(memberTable)
      .leftJoin(userTable, eq(memberTable.userId, userTable.id))
      .where(eq(memberTable.organizationId, activeOrg));

    return NextResponse.json({
      members: members.map((m) => ({
        ...m,
        createdAt: m.createdAt?.toISOString(),
      })),
      currentUserRole,
    });
  } catch (error: any) {
    console.error("[MEMBERS] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch members" },
      { status: 500 }
    );
  }
}
