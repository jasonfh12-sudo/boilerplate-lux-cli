import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { member, organization } from "@/permissions-schema";
import { session as sessionTable } from "@/auth-schema";
import { isSingleTenant, getOrCreateDefaultOrg, SINGLE_TENANT_ORG_ID } from "@/lib/auth-mode";
import { eq, and } from "drizzle-orm";

/**
 * Post-signup handler
 *
 * Handles organization assignment after Better Auth creates the user:
 * - single-tenant: Auto-join default org
 * - multi-tenant: Create org or join existing org based on request
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { organizationId, newOrganizationName, allowDomainAutoJoin } = body;

    // Single-tenant mode: Auto-join default org
    if (isSingleTenant()) {
      const defaultOrg = await getOrCreateDefaultOrg();

      // Check if user is already a member
      const existing = await db
        .select()
        .from(member)
        .where(
          and(
            eq(member.userId, session.user.id),
            eq(member.organizationId, SINGLE_TENANT_ORG_ID)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        // Add user as member of default org
        await db.insert(member).values({
          id: crypto.randomUUID(),
          organizationId: SINGLE_TENANT_ORG_ID,
          userId: session.user.id,
          role: "member",
          createdAt: new Date(),
        });
      }

      // Set active organization in session
      await db
        .update(sessionTable)
        .set({ activeOrganizationId: SINGLE_TENANT_ORG_ID })
        .where(eq(sessionTable.userId, session.user.id));

      return NextResponse.json({
        success: true,
        organizationId: SINGLE_TENANT_ORG_ID,
        mode: "single-tenant",
      });
    }

    // Multi-tenant mode: Handle org creation or joining
    if (organizationId) {
      // Join existing org
      console.log("[POST-SIGNUP] Joining organization:", organizationId, "for user:", session.user.id);
      const existing = await db
        .select()
        .from(member)
        .where(
          and(
            eq(member.userId, session.user.id),
            eq(member.organizationId, organizationId)
          )
        )
        .limit(1);

      console.log("[POST-SIGNUP] Existing membership check:", existing.length > 0 ? "Already a member" : "Not a member");

      if (existing.length === 0) {
        console.log("[POST-SIGNUP] Adding user as member");
        await db.insert(member).values({
          id: crypto.randomUUID(),
          organizationId,
          userId: session.user.id,
          role: "member",
          createdAt: new Date(),
        });
        console.log("[POST-SIGNUP] User successfully added as member");
      }

      // Set active organization in session
      console.log("[POST-SIGNUP] Setting active organization in session");
      await db
        .update(sessionTable)
        .set({ activeOrganizationId: organizationId })
        .where(eq(sessionTable.userId, session.user.id));

      console.log("[POST-SIGNUP] Successfully joined organization");
      return NextResponse.json({
        success: true,
        organizationId,
        mode: "multi-tenant",
        action: "joined",
      });
    } else if (newOrganizationName) {
      // Create new org and make user owner
      const slug = newOrganizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      // Store domain auto-join setting in metadata
      const metadata = JSON.stringify({
        allowDomainAutoJoin: allowDomainAutoJoin === true,
      });

      const newOrg = await db
        .insert(organization)
        .values({
          id: crypto.randomUUID(),
          name: newOrganizationName,
          slug,
          createdAt: new Date(),
          metadata,
        })
        .returning();

      const orgId = newOrg[0].id;

      // Add user as owner
      await db.insert(member).values({
        id: crypto.randomUUID(),
        organizationId: orgId,
        userId: session.user.id,
        role: "owner",
        createdAt: new Date(),
      });

      // Set active organization in session
      await db
        .update(sessionTable)
        .set({ activeOrganizationId: orgId })
        .where(eq(sessionTable.userId, session.user.id));

      return NextResponse.json({
        success: true,
        organizationId: orgId,
        mode: "multi-tenant",
        action: "created",
      });
    }

    return NextResponse.json(
      { error: "No organization action specified" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[POST-SIGNUP] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
