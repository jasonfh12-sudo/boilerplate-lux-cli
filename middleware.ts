import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authConfig, getRouteType } from "@/lib/auth.config";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if user has a session cookie
  const sessionToken = request.cookies.get("better-auth.session_token");
  const isAuthenticated = !!sessionToken;

  // Determine route type
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

  // Allow access to public routes
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
