import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { user, roles, pagePermissions } from "@/auth-schema";

const INTERFACE_ID = process.env.INTERFACE_ID || "unknown";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),

  // Base URL for callbacks and redirects
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",

  // Secret for signing tokens
  secret: process.env.BETTER_AUTH_SECRET!,

  // Email and password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  // Social OAuth providers
  socialProviders: {
    google: process.env.GOOGLE_CLIENT_ID
      ? {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }
      : undefined,
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    additionalFields: {
      interfaceId: {
        type: "string",
        required: false,
        defaultValue: INTERFACE_ID,
        input: false,
      },
      roleId: {
        type: "string",
        required: false,
        input: false,
      },
      roleName: {
        type: "string",
        required: false,
        input: false,
      },
      allowedRoutes: {
        type: "string", // JSON stringified array
        required: false,
        input: false,
      },
    },
  },

  // Hooks to populate session with role/permissions
  hooks: {
    after: async (context: any) => {
      // Only add role info during session creation
      if (context.type === "session.create" && context.session?.userId) {
        try {
          // Get user's role
          const userData = await db.query.user.findFirst({
            where: eq(user.id, context.session.userId),
            columns: { roleId: true },
          });

          if (userData?.roleId) {
            // Get role details
            const roleData = await db.query.roles.findFirst({
              where: eq(roles.id, userData.roleId),
            });

            if (roleData) {
              // Get all allowed routes for this role
              const permissions = await db.query.pagePermissions.findMany({
                where: and(
                  eq(pagePermissions.roleId, roleData.id),
                  eq(pagePermissions.canAccess, true)
                ),
              });

              const allowedRoutes = permissions.map(p => p.routePattern);

              // Add to session
              context.session.roleId = roleData.id;
              context.session.roleName = roleData.name;
              context.session.allowedRoutes = JSON.stringify(allowedRoutes);
            }
          }
        } catch (error) {
          console.error("Error adding role to session:", error);
        }
      }

      return context;
    },
  },

  // Advanced options
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },

  // User additional fields
  user: {
    additionalFields: {
      interfaceId: {
        type: "string",
        required: false,
        defaultValue: INTERFACE_ID,
        input: false,
      },
    },
  },
});
