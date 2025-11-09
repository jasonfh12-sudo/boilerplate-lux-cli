import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { user, session } from "@/auth-schema";
import { eq, desc } from "drizzle-orm";

/**
 * GET /api/admin/users - List all users
 *
 * Returns all registered users with their details
 */
export async function GET(req: NextRequest) {
  try {
    // Check if requester is authenticated
    const authSession = await auth.api.getSession({
      headers: await headers(),
    });

    if (!authSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Query all users from the database
    const users = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        image: user.image,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .orderBy(desc(user.createdAt));

    // Get last login for each user
    const usersWithSessions = await Promise.all(
      users.map(async (u) => {
        const sessions = await db
          .select({
            createdAt: session.createdAt,
          })
          .from(session)
          .where(eq(session.userId, u.id))
          .orderBy(desc(session.createdAt))
          .limit(1);

        return {
          ...u,
          lastLogin: sessions[0]?.createdAt || null,
        };
      })
    );

    return NextResponse.json({ users: usersWithSessions });
  } catch (error) {
    console.error("[API] Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
