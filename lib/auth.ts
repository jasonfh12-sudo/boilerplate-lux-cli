import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { db } from "./db";
import { user, session, account, verification } from "@/auth-schema";
import { organization as orgTable, member, invitation } from "@/permissions-schema";
import { getAllowedRoutesForUser } from "./permissions";

const INTERFACE_ID = process.env.INTERFACE_ID || "unknown";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user,
      session,
      account,
      verification,
      organization: orgTable,
      member,
      invitation,
    },
  }),

  // Base URL for callbacks and redirects
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",

  // Secret for signing tokens
  secret: process.env.BETTER_AUTH_SECRET!,

  // Email and password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    resetPasswordTokenExpiresIn: 3600, // 1 hour
    sendResetPasswordEmail: true,

    // Custom email sender for password reset
    async sendResetPassword({ user, url }) {
      const orgId = process.env.CLERK_ORG_ID;
      const backendUrl = process.env.BACKEND_API_URL || "http://localhost:3500";

      // Extract token from Better Auth URL: /api/auth/reset-password/:token
      const tokenMatch = url.match(/\/reset-password\/([^?]+)/);
      const token = tokenMatch ? tokenMatch[1] : null;

      if (!token) {
        console.error("[BETTER-AUTH] Failed to extract token from URL:", url);
        return;
      }

      // Build frontend page URL with token and email as query params
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4000";
      const resetPageUrl = `${baseUrl}/auth/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;

      console.log("[BETTER-AUTH] Password reset requested:", {
        email: user.email,
        token: token,
        resetUrl: resetPageUrl,
      });

      if (!orgId) {
        console.error("[BETTER-AUTH] CLERK_ORG_ID not set, cannot send email");
        console.log("[BETTER-AUTH] Reset URL:", resetPageUrl);
        return;
      }

      try {
        const response = await fetch(`${backendUrl}/email/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orgId,
            type: "password-reset",
            to: user.email,
            resetUrl: resetPageUrl,
            templateId: process.env.EMAIL_TEMPLATE_PASSWORD_RESET,
            // Additional context for the email
            userName: user.name || user.email,
            userEmail: user.email,
            appName: process.env.NEXT_PUBLIC_APP_NAME || "Lux AI",
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to send password reset email");
        }

        const result = await response.json();
        console.log("[BETTER-AUTH] Password reset email sent successfully:", result);
      } catch (error: any) {
        console.error("[BETTER-AUTH] Failed to send password reset email:", error.message);
        console.log("[BETTER-AUTH] Reset URL (fallback):", url);
      }
    },
  },

  // Social OAuth providers
  // Uses custom credentials if provided, otherwise falls back to platform defaults
  socialProviders: {
    google: {
      clientId:
        process.env.GOOGLE_CLIENT_ID ||
        "214136377052-29kuf8r65q7hk6qnluercghes08g75fh.apps.googleusercontent.com", // Lux platform default
      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET ||
        "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", // Lux platform default
    },
  },

  // Session configuration with interface tracking and permissions
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
      allowedRoutes: {
        type: "string", // JSON string of route patterns
        required: false,
        input: false,
      },
      roleId: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },

  // Advanced options
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
    crossSubDomainCookies: {
      enabled: false,
    },
    useSecureCookies: false, // Allow HTTP in development
  },

  // Trusted origins for CSRF protection
  trustedOrigins: [
    "http://localhost:4000",
    "http://localhost:3000",
  ],

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

  // Enable Better Auth's native organization plugin
  plugins: [
    organization({
      // Allow users to create organizations
      allowUserToCreateOrganization: true,

      // Maximum organizations per user
      organizationLimit: 10,

      // Maximum members per organization
      membershipLimit: 100,

      // Invitation expires in 7 days (604800 seconds)
      invitationExpiresIn: 604800,

      // Email verification not required for invitations
      requireEmailVerificationOnInvitation: false,

      // Creator gets owner role by default
      creatorRole: "owner",

      // Custom invitation email sending
      async sendInvitationEmail(data) {
        // Extract inviter information with fallbacks
        const inviterName = data.inviter?.name || data.inviter?.email || 'A team member';
        const inviterEmail = data.inviter?.email || 'unknown';
        const organizationName = data.organization?.name || 'the organization';

        console.log("[BETTER-AUTH] Organization invitation:", {
          to: data.email,
          from: inviterEmail,
          inviterName,
          organizationName,
          invitationId: data.id
        });

        // Build invite link with email and organization name
        const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invite?token=${data.id}&email=${encodeURIComponent(data.email)}&org=${encodeURIComponent(organizationName)}`;
        const orgId = process.env.CLERK_ORG_ID;

        if (!orgId) {
          console.error("[BETTER-AUTH] CLERK_ORG_ID not set, cannot send email");
          console.log("[BETTER-AUTH] Invitation link:", inviteLink);
          return;
        }

        try {
          // Call backend email service
          const backendUrl = process.env.BACKEND_API_URL || "http://localhost:3500";
          const response = await fetch(`${backendUrl}/email/send`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              orgId,
              type: "org-invite",
              to: data.email,
              inviterName,
              organizationName,
              inviteUrl: inviteLink,
              templateId: process.env.EMAIL_TEMPLATE_ORG_INVITE,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to send invitation email");
          }

          const result = await response.json();
          console.log("[BETTER-AUTH] Invitation email sent successfully:", result);
        } catch (error: any) {
          console.error("[BETTER-AUTH] Failed to send invitation email:", error.message);
          console.log("[BETTER-AUTH] Invitation link (fallback):", inviteLink);
        }
      },
    }),
  ],
});
