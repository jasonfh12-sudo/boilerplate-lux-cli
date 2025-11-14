import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authConfig, getRouteType } from "@/lib/auth.config";
import { auth } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if user has a session cookie
  const sessionToken = request.cookies.get("better-auth.session_token");
  const isAuthenticated = !!sessionToken;

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
    try {
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      if (session?.user) {
        const { userCanAccessRoute } = await import("@/lib/permissions");
        const hasAccess = await userCanAccessRoute(session.user.id, pathname);

        if (!hasAccess) {
          return NextResponse.json(
            { error: "Forbidden: You don't have permission to access this resource" },
            { status: 403 }
          );
        }
      }
    } catch (error) {
      console.error("Error checking API permissions:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

  // For authenticated users, check role-based permissions
  if (isAuthenticated) {
    try {
      // Get session to extract user ID
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      if (session?.user) {
        // Dynamically import to avoid edge runtime issues
        const { userCanAccessRoute } = await import("@/lib/permissions");

        const hasAccess = await userCanAccessRoute(session.user.id, pathname);

        if (!hasAccess) {
          // User doesn't have permission for this route
          return NextResponse.redirect(
            new URL("/unauthorized", request.url)
          );
        }
      }
    } catch (error) {
      console.error("Error checking permissions:", error);
      // On error, allow access (fail open) to prevent locking users out
      // In production, you might want to fail closed instead
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
