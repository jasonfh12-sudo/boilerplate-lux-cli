import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { member } from "@/permissions-schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Check if user has any organization memberships
    const memberships = await db
      .select()
      .from(member)
      .where(eq(member.userId, session.user.id))
      .limit(1);

    return NextResponse.json({
      hasOrganization: memberships.length > 0,
      email: session.user.email,
    });
  } catch (error: any) {
    console.error("[CHECK-USER-ORG] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
