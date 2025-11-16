import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { member } from "@/permissions-schema";
import { session as sessionTable } from "@/auth-schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { getAllowedRoutesForUser } from "@/lib/permissions";

const INTERFACE_ID = process.env.INTERFACE_ID || "unknown";

/**
 * Post-signin handler
 *
 * Sets the activeOrganizationId in the session after successful sign-in.
 * This ensures users can access organization-scoped features immediately.
 */
export async function POST(req: NextRequest) {
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

    // Check if activeOrganizationId is already set
    if (session.session.activeOrganizationId) {
      // Still populate permissions if they're missing
      if (!session.session.allowedRoutes) {
        try {
          const allowedRoutes = await getAllowedRoutesForUser(
            session.user.id,
            session.session.activeOrganizationId,
            INTERFACE_ID
          );

          if (allowedRoutes.length > 0) {
            await db
              .update(sessionTable)
              .set({
                allowedRoutes: JSON.stringify(allowedRoutes),
              })
              .where(eq(sessionTable.id, session.session.id));

            console.log("[POST-SIGNIN] Populated permissions for existing session:", {
              userId: session.user.id,
              allowedRoutesCount: allowedRoutes.length,
            });
          }
        } catch (error) {
          console.error("[POST-SIGNIN] Error populating permissions:", error);
        }
      }

      return NextResponse.json({
        success: true,
        activeOrganizationId: session.session.activeOrganizationId,
        message: "Active organization already set",
      });
    }

    // Find user's first organization
    const memberships = await db
      .select()
      .from(member)
      .where(eq(member.userId, session.user.id))
      .limit(1);

    if (memberships.length === 0) {
      return NextResponse.json(
        { error: "User is not a member of any organization" },
        { status: 400 }
      );
    }

    const firstOrgId = memberships[0].organizationId;

    // Get allowed routes for this user based on their role
    let allowedRoutes: string[] = [];
    try {
      allowedRoutes = await getAllowedRoutesForUser(
        session.user.id,
        firstOrgId,
        INTERFACE_ID
      );
      console.log("[POST-SIGNIN] Found", allowedRoutes.length, "allowed routes for user");
    } catch (error) {
      console.error("[POST-SIGNIN] Error getting allowed routes:", error);
      // Continue without permissions - user will have no access
    }

    // Update session with activeOrganizationId and allowedRoutes
    await db
      .update(sessionTable)
      .set({
        activeOrganizationId: firstOrgId,
        allowedRoutes: allowedRoutes.length > 0 ? JSON.stringify(allowedRoutes) : null,
      })
      .where(eq(sessionTable.userId, session.user.id));

    console.log("[POST-SIGNIN] Set active organization and permissions:", {
      userId: session.user.id,
      organizationId: firstOrgId,
      allowedRoutesCount: allowedRoutes.length,
    });

    return NextResponse.json({
      success: true,
      activeOrganizationId: firstOrgId,
      allowedRoutesCount: allowedRoutes.length,
    });
  } catch (error: any) {
    console.error("[POST-SIGNIN] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
