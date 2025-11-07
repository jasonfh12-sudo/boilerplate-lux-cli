/**
 * Authentication Configuration
 *
 * This file defines which routes require authentication and which are public.
 * Update this file to control access to different parts of your application.
 */

export const authConfig = {
  /**
   * Routes that require authentication
   * Users will be redirected to sign-in if not authenticated
   */
  protectedRoutes: [
    "/", // Home page is protected (dashboard)
    "/dashboard",
    "/profile",
    "/settings",
    "/account",
    // Add more protected routes here
  ],

  /**
   * Auth pages (sign-in, sign-up, etc.)
   * Authenticated users will be redirected away from these pages
   */
  authRoutes: [
    "/auth/signin",
    "/auth/signup",
    "/auth/reset-password",
    "/auth/verify-email",
  ],

  /**
   * Public routes that anyone can access
   * These routes are accessible whether authenticated or not
   */
  publicRoutes: [
    "/about",
    "/pricing",
    "/contact",
    "/blog",
    "/docs",
    // Add more public routes here
  ],

  /**
   * Default redirect destinations
   */
  redirects: {
    // Where to redirect after successful sign-in
    afterSignIn: "/dashboard",

    // Where to redirect authenticated users who try to access auth pages
    afterAuth: "/dashboard",

    // Where to redirect unauthenticated users
    toSignIn: "/auth/signin",
  },

  /**
   * Route matching options
   */
  options: {
    // If true, "/dashboard" will also match "/dashboard/settings"
    matchPrefixes: true,

    // If true, "/" is treated as a public route even if not in publicRoutes
    rootIsPublic: false,
  },
} as const;

/**
 * Helper function to check if a route matches a pattern
 */
export function isRouteMatch(pathname: string, pattern: string, matchPrefix = true): boolean {
  if (matchPrefix) {
    return pathname === pattern || pathname.startsWith(pattern + "/");
  }
  return pathname === pattern;
}

/**
 * Helper function to determine route type
 */
export function getRouteType(pathname: string): "protected" | "auth" | "public" {
  const { protectedRoutes, authRoutes, publicRoutes, options } = authConfig;

  // Check if it's a protected route
  if (protectedRoutes.some(route => isRouteMatch(pathname, route, options.matchPrefixes))) {
    return "protected";
  }

  // Check if it's an auth route
  if (authRoutes.some(route => isRouteMatch(pathname, route, options.matchPrefixes))) {
    return "auth";
  }

  // Check if it's explicitly public
  if (publicRoutes.some(route => isRouteMatch(pathname, route, options.matchPrefixes))) {
    return "public";
  }

  // Special case for root
  if (pathname === "/" && options.rootIsPublic) {
    return "public";
  }

  // Default: treat as public (change to "protected" for whitelist approach)
  return "public";
}
