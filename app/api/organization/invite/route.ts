import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { invitation, organization as orgTable } from "@/permissions-schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { email, role = "member" } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate role
    if (!["member", "admin", "owner"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be member, admin, or owner" },
        { status: 400 }
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

    // Get organization details
    const orgs = await db
      .select()
      .from(orgTable)
      .where(eq(orgTable.id, activeOrg))
      .limit(1);

    if (orgs.length === 0) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const organization = orgs[0];

    // Create invitation in database
    const invitationId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    await db.insert(invitation).values({
      id: invitationId,
      organizationId: activeOrg,
      email,
      role,
      status: "pending",
      expiresAt: expiresAt, // Pass Date object, Drizzle converts to timestamp_ms
      inviterId: session.user.id,
      createdAt: now, // Explicitly set createdAt
    });

    console.log("[INVITE] Created invitation:", {
      id: invitationId,
      email,
      organizationId: activeOrg,
      role,
    });

    // Manually send invitation email via backend
    const inviterName = session.user.name || session.user.email || "A team member";
    const organizationName = organization.name || "the organization";
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invite?token=${invitationId}&email=${encodeURIComponent(email)}&org=${encodeURIComponent(organizationName)}`;
    const orgId = process.env.CLERK_ORG_ID;
    const backendUrl = process.env.BACKEND_API_URL || "http://localhost:3500";

    if (orgId) {
      try {
        const response = await fetch(`${backendUrl}/email/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orgId,
            type: "org-invite",
            to: email,
            inviterName,
            organizationName,
            inviteUrl: inviteLink,
            templateId: process.env.EMAIL_TEMPLATE_ORG_INVITE,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error("[INVITE] Failed to send email:", error);
        } else {
          const result = await response.json();
          console.log("[INVITE] Email sent successfully:", result);
        }
      } catch (error: any) {
        console.error("[INVITE] Error sending email:", error.message);
        console.log("[INVITE] Invitation link (fallback):", inviteLink);
      }
    } else {
      console.log("[INVITE] CLERK_ORG_ID not set, invitation link:", inviteLink);
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitationId,
        email,
        role,
        organizationId: activeOrg,
      },
    });
  } catch (error: any) {
    console.error("[INVITE] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send invitation" },
      { status: 500 }
    );
  }
}
