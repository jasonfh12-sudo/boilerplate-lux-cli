import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user as userTable, account } from "@/auth-schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Check if user exists
    const users = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, email))
      .limit(1);

    if (users.length === 0) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({
        success: true,
        message: "If an account exists, password reset email has been sent",
      });
    }

    const user = users[0];

    // Check if this user has any accounts (OAuth or email/password)
    const accounts = await db
      .select()
      .from(account)
      .where(eq(account.userId, user.id));

    // Check if user ONLY has Google OAuth (no email/password account)
    const hasGoogleAccount = accounts.some((acc) => acc.providerId === "google");
    const hasEmailPasswordAccount = accounts.some((acc) => acc.providerId === "credential");

    if (hasGoogleAccount && !hasEmailPasswordAccount) {
      return NextResponse.json(
        { error: "This account is associated with Google. Please sign in with Google instead." },
        { status: 400 }
      );
    }

    // If user has email/password account, proceed with password reset
    if (hasEmailPasswordAccount) {
      // Use Better Auth's forgetPassword API
      await auth.api.forgetPassword({
        body: {
          email,
          redirectTo: "/auth/reset-password",
        },
        headers: await headers(),
      });

      return NextResponse.json({
        success: true,
        message: "Password reset email sent",
      });
    }

    // User exists but has no accounts (shouldn't happen, but handle gracefully)
    return NextResponse.json({
      success: true,
      message: "If an account exists, password reset email has been sent",
    });
  } catch (error: any) {
    console.error("[FORGET-PASSWORD] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
