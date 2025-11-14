import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authConfig, getRouteType } from "@/lib/auth.config";

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

    // Note: Role-based permission checks for API routes should be done
    // in the API route handlers themselves, not in middleware
    // (middleware runs in Edge Runtime which doesn't support database access)
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

  // Note: Role-based permission checks for pages should be done
  // in server components or getServerSideProps, not in middleware
  // (middleware runs in Edge Runtime which doesn't support database access)

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
