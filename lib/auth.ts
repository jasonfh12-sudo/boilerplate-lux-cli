import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";

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
    // Email sending will be configured later
    sendResetPassword: async ({ user, url, token }: any) => {
      // TODO: Implement email sending
      console.log(`Password reset for ${user.email}: ${url}`);
    },
    sendVerificationEmail: async ({ user, url, token }: any) => {
      // TODO: Implement email verification
      console.log(`Email verification for ${user.email}: ${url}`);
    },
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
