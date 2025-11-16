"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handleEmailPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await authClient.signIn.email({
        email,
        password,
        callbackURL: "/",
      });

      // Set active organization after sign-in
      try {
        const response = await fetch("/api/auth/post-signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          const error = await response.json();
          console.warn("[SIGNIN] Failed to set active organization:", error);
        }
      } catch (postSigninErr) {
        console.warn("[SIGNIN] Post-signin call failed:", postSigninErr);
      }

      router.push("/");
    } catch (err) {
      setError("Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });

      // Set active organization after sign-in
      try {
        const response = await fetch("/api/auth/post-signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          const error = await response.json();
          console.warn("[SIGNIN] Failed to set active organization:", error);
        }
      } catch (postSigninErr) {
        console.warn("[SIGNIN] Post-signin call failed:", postSigninErr);
      }
    } catch (err) {
      setError("Failed to sign in with Google");
    }
  };

  // Magic link authentication not yet configured
  // const handleMagicLink = async () => {
  //   if (!email) {
  //     setError("Please enter your email");
  //     return;
  //   }

  //   setError("");
  //   setIsLoading(true);

  //   try {
  //     await authClient.signIn.magicLink({
  //       email,
  //       callbackURL: "/",
  //     });
  //     setMagicLinkSent(true);
  //   } catch (err) {
  //     setError("Failed to send magic link");
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  if (magicLinkSent) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-green-600 text-sm">
          ✓ Magic link sent! Check your email.
        </div>
        <button
          onClick={() => setMagicLinkSent(false)}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          ← Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Google Sign In */}
      {process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === "true" && (
        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>
      )}

      {process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === "true" && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">Or continue with</span>
          </div>
        </div>
      )}

      {/* Email/Password Form */}
      <form onSubmit={handleEmailPassword} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {/* Forgot Password Link */}
      <div className="text-center">
        <a
          href="/auth/forgot-password"
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Forgot your password?
        </a>
      </div>

      {/* Magic Link Option - Disabled (not configured) */}
      {/* <button
        onClick={handleMagicLink}
        disabled={isLoading}
        className="w-full text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
      >
        Send me a magic link instead →
      </button> */}

      {/* Sign Up Link */}
      <div className="text-center text-sm text-gray-600">
        Don't have an account?{" "}
        <a href="/auth/signup" className="text-gray-900 hover:underline">
          Sign up
        </a>
      </div>
    </div>
  );
}
