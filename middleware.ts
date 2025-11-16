import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authConfig, getRouteType } from "@/lib/auth.config";

/**
 * Helper to match route patterns with wildcards
 */
function matchesRoutePattern(route: string, pattern: string): boolean {
  if (route === pattern) {
    return true;
  }

  // Match /** (multi-level wildcard)
  if (pattern.endsWith("/**")) {
    const basePattern = pattern.slice(0, -3);
    return route.startsWith(basePattern + "/") || route === basePattern;
  }

  // Match /* (single-level wildcard)
  if (pattern.endsWith("/*")) {
    const basePattern = pattern.slice(0, -2);
    const routeParts = route.split("/");
    const patternParts = basePattern.split("/");

    if (routeParts.length !== patternParts.length + 1) {
      return false;
    }

    return route.startsWith(basePattern + "/");
  }

  return false;
}

/**
 * Check if user can access a route based on their allowed routes from session
 */
function canAccessRoute(allowedRoutes: string[], route: string): boolean {
  for (const pattern of allowedRoutes) {
    if (matchesRoutePattern(route, pattern)) {
      return true;
    }
  }
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // No-auth mode: Bypass all authentication checks
  const authMode = process.env.AUTH_MODE || 'multi-tenant';
  if (authMode === 'none') {
    return NextResponse.next();
  }

  // Check if user has a session cookie
  const sessionToken = request.cookies.get("better-auth.session_token");
  const isAuthenticated = !!sessionToken;

  // Try to extract session data from cookie (it's a JWT)
  let sessionData: {
    allowedRoutes?: string;
    organizationId?: string;
    userId?: string;
    roleId?: string;
  } | null = null;
  if (sessionToken) {
    try {
      // The session token is a JWT, decode the payload (base64)
      const payload = sessionToken.value.split('.')[1];
      if (payload) {
        const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
        sessionData = decoded;
      }
    } catch (error) {
      console.error("Error decoding session token:", error);
    }
  }

  // Special handling for API routes
  if (pathname.startsWith("/api/")) {
    // API auth routes are always allowed
    if (pathname.startsWith("/api/auth/")) {
      return NextResponse.next();
    }

    // All other API routes require authentication
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check role-based permissions for API routes
    if (sessionData?.allowedRoutes) {
      try {
        const allowedRoutes = JSON.parse(sessionData.allowedRoutes);

        // Check if user has permission to access this API route
        if (!canAccessRoute(allowedRoutes, pathname)) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      } catch (error) {
        console.error("Error parsing allowedRoutes:", error);
        return NextResponse.json({ error: "Invalid session" }, { status: 401 });
      }
    }

    // Inject organization and user context as headers for API routes
    if (sessionData) {
      const requestHeaders = new Headers(request.headers);
      if (sessionData.organizationId) {
        requestHeaders.set("x-organization-id", sessionData.organizationId);
      }
      if (sessionData.userId) {
        requestHeaders.set("x-user-id", sessionData.userId);
      }
      if (sessionData.roleId) {
        requestHeaders.set("x-role-id", sessionData.roleId);
      }

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    return NextResponse.next();
  }

  // Page route handling (non-API)
  // Determine route type from config
  const routeType = getRouteType(pathname);

  // Handle auth routes (signin, signup, etc.)
  // Redirect authenticated users away from auth pages
  if (routeType === "auth" && isAuthenticated) {
    return NextResponse.redirect(new URL(authConfig.redirects.afterAuth, request.url));
  }

  // Handle protected routes
  // Redirect unauthenticated users to signin
  if (routeType === "protected" && !isAuthenticated) {
    const signInUrl = new URL(authConfig.redirects.toSignIn, request.url);
    // Preserve the original destination for redirect after sign-in
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Check role-based permissions for protected page routes
  if (routeType === "protected" && sessionData?.allowedRoutes) {
    try {
      const allowedRoutes = JSON.parse(sessionData.allowedRoutes);

      // Check if user has permission to access this page
      if (!canAccessRoute(allowedRoutes, pathname)) {
        // Redirect to unauthorized page or home
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }
    } catch (error) {
      console.error("Error parsing allowedRoutes:", error);
      // If session is invalid, redirect to signin
      const signInUrl = new URL(authConfig.redirects.toSignIn, request.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Allow access to public routes
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
