/**
 * Session utilities for managing user sessions
 */

import { db } from "./db";
import { eq } from "drizzle-orm";
import { session } from "@/auth-schema";

/**
 * Invalidate all sessions for a user (e.g., when their role changes)
 * This forces them to re-login and get a new session with updated permissions
 */
export async function invalidateUserSessions(userId: string): Promise<void> {
  try {
    // Delete all active sessions for this user
    await db.delete(session).where(eq(session.userId, userId));
  } catch (error) {
    console.error("Error invalidating user sessions:", error);
    throw error;
  }
}

/**
 * Invalidate a specific session by ID
 */
export async function invalidateSession(sessionId: string): Promise<void> {
  try {
    await db.delete(session).where(eq(session.id, sessionId));
  } catch (error) {
    console.error("Error invalidating session:", error);
    throw error;
  }
}
