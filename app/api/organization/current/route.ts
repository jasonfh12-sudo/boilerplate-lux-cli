import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { organization } from "@/permissions-schema";
import { eq } from "drizzle-orm";

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

    // Fetch organization details
    const orgs = await db
      .select()
      .from(organization)
      .where(eq(organization.id, activeOrg))
      .limit(1);

    if (orgs.length === 0) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const org = orgs[0];

    return NextResponse.json({
      organization: {
        ...org,
        createdAt: org.createdAt?.toISOString(),
        updatedAt: org.updatedAt?.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("[CURRENT-ORG] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch organization" },
      { status: 500 }
    );
  }
}
