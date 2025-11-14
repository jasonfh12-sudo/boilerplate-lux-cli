import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isUserAdmin } from "@/lib/permissions";

/**
 * Middleware helper to check if the current user is an admin
 * Use this in admin API routes to protect them
 */
export async function requireAdmin(request: NextRequest) {
  // Check authentication
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  const admin = await isUserAdmin(session.user.id);

  if (!admin) {
    return NextResponse.json(
      { error: "Forbidden: Admin access required" },
      { status: 403 }
    );
  }

  return null; // No error, user is authorized
}
