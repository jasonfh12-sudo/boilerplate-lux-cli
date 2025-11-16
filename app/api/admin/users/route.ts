import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { user, session } from "@/auth-schema";
import { eq, desc } from "drizzle-orm";
import { assignRoleToUser } from "@/lib/permissions";

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
        roleId: user.roleId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .orderBy(desc(user.createdAt));

    // Get last login for each user
    const usersWithSessions = await Promise.all(
      users.map(async (u) => {
        if (!u || !u.id) {
          console.error("[API] Invalid user object:", u);
          return null;
        }

        try {
          const sessions = await db
            .select({
              createdAt: session.createdAt,
            })
            .from(session)
            .where(eq(session.userId, u.id))
            .orderBy(desc(session.createdAt))
            .limit(1);

          return {
            id: u.id,
            email: u.email,
            name: u.name,
            emailVerified: u.emailVerified,
            image: u.image,
            roleId: u.roleId,
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
            lastLogin: sessions[0]?.createdAt || null,
          };
        } catch (err) {
          console.error(`[API] Error fetching sessions for user ${u.id}:`, err);
          return {
            id: u.id,
            email: u.email,
            name: u.name,
            emailVerified: u.emailVerified,
            image: u.image,
            roleId: u.roleId,
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
            lastLogin: null,
          };
        }
      })
    );

    // Filter out any null entries
    const validUsers = usersWithSessions.filter((u) => u !== null);

    return NextResponse.json({ users: validUsers });
  } catch (error) {
    console.error("[API] Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users/assign-role - Assign a role to a user
 */
export async function POST(req: NextRequest) {
  try {
    // Check if requester is authenticated
    const authSession = await auth.api.getSession({
      headers: await headers(),
    });

    if (!authSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { userId, roleId } = body;

    if (!userId || !roleId) {
      return NextResponse.json(
        { error: "userId and roleId are required" },
        { status: 400 }
      );
    }

    await assignRoleToUser(userId, roleId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Error assigning role:", error);
    return NextResponse.json(
      { error: "Failed to assign role" },
      { status: 500 }
    );
  }
}
