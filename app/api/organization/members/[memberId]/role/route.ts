import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { member } from "@/permissions-schema";
import { eq } from "drizzle-orm";

/**
 * PATCH /api/organization/members/[memberId]/role
 * Assign a custom role to a member
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { memberId: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { customRoleId } = body;

    // Update the member's custom role
    await db
      .update(member)
      .set({ customRoleId: customRoleId || null })
      .where(eq(member.id, params.memberId));

    console.log(`[ASSIGN-ROLE] Assigned role ${customRoleId} to member ${params.memberId}`);

    return NextResponse.json({
      success: true,
      message: "Role assigned successfully",
    });
  } catch (error: any) {
    console.error("[ASSIGN-ROLE] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to assign role" },
      { status: 500 }
    );
  }
}
