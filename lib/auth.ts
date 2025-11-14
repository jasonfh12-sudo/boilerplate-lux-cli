import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { db } from "./db";
import { user, session, account, verification } from "@/auth-schema";
import { organization as orgTable, member, invitation } from "@/permissions-schema";

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

  // Session configuration with interface tracking
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
        console.log("[BETTER-AUTH] Organization invitation:", {
          to: data.email,
          from: data.inviter.email,
          organizationName: data.organization.name,
          invitationId: data.id
        });

        // TODO: Integrate with email service (Resend, SendGrid, etc.)
        // For now, log the invitation link
        const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invite?token=${data.id}`;
        console.log("[BETTER-AUTH] Invitation link:", inviteLink);

        // In production, send actual email here:
        // await sendEmail({
        //   to: data.email,
        //   subject: `You've been invited to ${data.organization.name}`,
        //   html: `Click here to accept: ${inviteLink}`
        // });
      },
    }),
  ],
});
