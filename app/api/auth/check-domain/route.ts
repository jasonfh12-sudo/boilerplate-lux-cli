import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user } from "@/auth-schema";
import { member, organization } from "@/permissions-schema";
import { eq, and } from "drizzle-orm";

const AUTH_MODE = process.env.AUTH_MODE || "multi-tenant";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    console.log("[CHECK-DOMAIN] Request for email:", email);
    console.log("[CHECK-DOMAIN] AUTH_MODE:", AUTH_MODE);

    if (!email) {
      return NextResponse.json(
        { success: false, error: "email is required" },
        { status: 400 }
      );
    }

    const domain = email.split("@")[1];
    const multiTenant = AUTH_MODE === "multi-tenant";

    // No-auth mode or single-tenant mode: no domain checking needed
    if (AUTH_MODE === "none" || AUTH_MODE === "single-tenant") {
      console.log("[CHECK-DOMAIN] Returning single-tenant/no-auth response");
      return NextResponse.json({
        canAutoJoin: AUTH_MODE === "single-tenant",
        matchingOrgs: [],
        multiTenant: false,
      });
    }

    // Multi-tenant mode: Check for existing users with the same domain
    const { sql: drizzleSql } = await import("drizzle-orm");

    const usersWithDomain = await db
      .select({
        userId: user.id,
        userEmail: user.email,
      })
      .from(user)
      .where(drizzleSql`${user.email} LIKE '%@' || ${domain}`)
      .limit(50);

    if (usersWithDomain.length === 0) {
      // No users with this email domain yet
      console.log("[CHECK-DOMAIN] No users with domain found, returning empty result");
      return NextResponse.json({
        canAutoJoin: false,
        matchingOrgs: [],
        multiTenant: true,
      });
    }

    // Find organizations these users belong to
    const userIds = usersWithDomain.map((u) => u.userId);

    // Get all unique organizations from these users
    const memberships = await db
      .select({
        orgId: member.organizationId,
        orgName: organization.name,
        orgSlug: organization.slug,
        orgMetadata: organization.metadata,
      })
      .from(member)
      .innerJoin(organization, eq(member.organizationId, organization.id))
      .where(drizzleSql`${member.userId} IN ${userIds}`)
      .limit(20);

    // Filter to only show orgs that allow domain auto-join
    const matchingOrgs = memberships
      .filter((m) => {
        try {
          const metadata = m.orgMetadata ? JSON.parse(m.orgMetadata) : {};
          return metadata.allowDomainAutoJoin === true;
        } catch {
          return false;
        }
      })
      .map((m) => ({
        id: m.orgId,
        name: m.orgName || "Unknown",
        slug: m.orgSlug || "unknown",
      }));

    // Remove duplicates
    const uniqueOrgs = Array.from(
      new Map(matchingOrgs.map((org) => [org.id, org])).values()
    );

    console.log("[CHECK-DOMAIN] Returning result with", uniqueOrgs.length, "matching orgs");
    return NextResponse.json({
      canAutoJoin: uniqueOrgs.length > 0,
      matchingOrgs: uniqueOrgs,
      multiTenant: true,
    });
  } catch (error: any) {
    console.error("[CHECK-DOMAIN] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
