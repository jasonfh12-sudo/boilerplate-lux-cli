import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { user, roles, pagePermissions, organizations } from "@/auth-schema";

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
      organizationId: {
        type: "string",
        required: false,
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
          // Get user's role and organization
          const userData = await db.query.user.findFirst({
            where: eq(user.id, context.session.userId),
            columns: { roleId: true, organizationId: true },
          });

          // Add organization ID to session
          if (userData?.organizationId) {
            context.session.organizationId = userData.organizationId;
          }

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
      organizationId: {
        type: "string",
        required: false,
        input: true, // Allow passing organizationId during signup
      },
    },
  },

  // Additional plugins for organization handling
  plugins: [
    {
      id: "organization-handler",
      hooks: {
        before: [
          {
            matcher: (context) => context.path === "/sign-up/email",
            handler: async (ctx) => {
              const body = ctx.body as any;
              const newOrganizationName = body.newOrganizationName;
              const CC_CLOUD_URL = process.env.CC_CLOUD_URL || process.env.NEXT_PUBLIC_CC_CLOUD_URL || "http://localhost:8000";
              const ORG_ID = process.env.CLERK_ORG_ID;

              // If creating a new organization, call cc_cloud to create it
              if (newOrganizationName && !body.organizationId) {
                try {
                  const response = await fetch(`${CC_CLOUD_URL}/auth/orgs`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      interfaceId: INTERFACE_ID,
                      orgId: ORG_ID,
                      name: newOrganizationName,
                      allowDomainSignup: false,
                    }),
                  });

                  if (response.ok) {
                    const data = await response.json();
                    // Store orgId in context for after hook
                    (ctx as any)._pendingOrgId = data.organization.id;
                  }
                } catch (error) {
                  console.error("Failed to create organization:", error);
                }
              } else if (body.organizationId) {
                // Store existing orgId for after hook
                (ctx as any)._pendingOrgId = body.organizationId;
              }

              return ctx;
            },
          },
        ],
        after: [
          {
            matcher: (context) => context.path === "/sign-up/email",
            handler: async (ctx) => {
              // After user is created by Better Auth, update organizationId
              const pendingOrgId = (ctx as any)._pendingOrgId;
              const userId = ctx.user?.id;

              if (pendingOrgId && userId) {
                try {
                  // Check if this is the first user in the organization
                  const existingUsers = await db
                    .select({ id: user.id })
                    .from(user)
                    .where(eq(user.organizationId, pendingOrgId))
                    .limit(1);

                  const isFirstUser = existingUsers.length === 0;

                  // Get or create default admin role
                  let adminRoleId: string | null = null;
                  if (isFirstUser) {
                    const adminRole = await db
                      .select({ id: roles.id })
                      .from(roles)
                      .where(eq(roles.name, "Admin"))
                      .limit(1);

                    if (adminRole.length > 0) {
                      adminRoleId = adminRole[0].id;
                    }
                  }

                  // Update user with organizationId and roleId (if first user)
                  const updateData: any = { organizationId: pendingOrgId };
                  if (adminRoleId) {
                    updateData.roleId = adminRoleId;
                  }

                  await db
                    .update(user)
                    .set(updateData)
                    .where(eq(user.id, userId));

                  console.log("Updated user with organizationId:", {
                    userId,
                    organizationId: pendingOrgId,
                    isFirstUser,
                    roleId: adminRoleId
                  });
                } catch (error) {
                  console.error("Failed to update user organizationId:", error);
                }
              }

              return ctx;
            },
          },
        ],
      },
    },
  ],
});
