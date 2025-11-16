import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { invitation, member } from "@/permissions-schema";
import { user as userTable, session as sessionTable } from "@/auth-schema";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { invitationId, password } = body;

    if (!invitationId) {
      return NextResponse.json(
        { error: "Invitation ID is required" },
        { status: 400 }
      );
    }

    // Check if user is already authenticated (e.g., via OAuth)
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    // Fetch invitation
    const invites = await db
      .select()
      .from(invitation)
      .where(eq(invitation.id, invitationId))
      .limit(1);

    if (invites.length === 0) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    const invite = invites[0];

    // Check if invitation is expired
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 }
      );
    }

    // Check if invitation is still pending
    if (invite.status !== "pending") {
      return NextResponse.json(
        { error: "Invitation has already been used" },
        { status: 400 }
      );
    }

    let userId: string;

    // If user is already authenticated (OAuth), use their session
    if (session && session.user) {
      userId = session.user.id;

      // Verify the authenticated user's email matches the invitation
      if (session.user.email !== invite.email) {
        return NextResponse.json(
          { error: "Your email does not match the invitation email" },
          { status: 400 }
        );
      }

      // Check if they're already a member
      const existingMembers = await db
        .select()
        .from(member)
        .where(
          and(
            eq(member.userId, userId),
            eq(member.organizationId, invite.organizationId)
          )
        )
        .limit(1);

      if (existingMembers.length > 0) {
        return NextResponse.json(
          { error: "User is already a member of this organization" },
          { status: 400 }
        );
      }
    } else {
      // User not authenticated - need password for email/password sign-up
      if (!password) {
        return NextResponse.json(
          { error: "Password is required" },
          { status: 400 }
        );
      }

      // Check if user already exists
      const existingUsers = await db
        .select()
        .from(userTable)
        .where(eq(userTable.email, invite.email))
        .limit(1);

      if (existingUsers.length > 0) {
        // User exists, just add them to the organization
        userId = existingUsers[0].id;

        // Check if they're already a member
        const existingMembers = await db
          .select()
          .from(member)
          .where(
            and(
              eq(member.userId, userId),
              eq(member.organizationId, invite.organizationId)
            )
          )
          .limit(1);

        if (existingMembers.length > 0) {
          return NextResponse.json(
            { error: "User is already a member of this organization" },
            { status: 400 }
          );
        }
      } else {
        // Create new user using Better Auth's sign-up API
        try {
          const signupResponse = await auth.api.signUpEmail({
            body: {
              email: invite.email,
              password: password,
              name: invite.email.split("@")[0],
            },
            headers: await headers(),
          });

          if (!signupResponse || !signupResponse.user) {
            throw new Error("Failed to create user account");
          }

          userId = signupResponse.user.id;
        } catch (signupError: any) {
          console.error("[ACCEPT-INVITE] Signup error:", signupError);
          return NextResponse.json(
            { error: signupError.message || "Failed to create user account" },
            { status: 500 }
          );
        }
      }
    }

    // Add user to organization
    await db.insert(member).values({
      id: crypto.randomUUID(),
      userId: userId,
      organizationId: invite.organizationId,
      role: invite.role || "member",
      createdAt: new Date(),
    });

    // Mark invitation as accepted
    await db
      .update(invitation)
      .set({ status: "accepted" })
      .where(eq(invitation.id, invitationId));

    // Set active organization in session
    await db
      .update(sessionTable)
      .set({ activeOrganizationId: invite.organizationId })
      .where(eq(sessionTable.userId, userId));

    console.log("[ACCEPT-INVITE] User successfully joined organization:", {
      userId,
      email: invite.email,
      organizationId: invite.organizationId,
    });

    return NextResponse.json({
      success: true,
      message: "Successfully joined organization",
    });
  } catch (error: any) {
    console.error("[ACCEPT-INVITE] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to accept invitation" },
      { status: 500 }
    );
  }
}
