"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

interface MatchingOrg {
  id: string;
  name: string;
  slug: string;
}

interface DomainCheckResult {
  canAutoJoin: boolean;
  matchingOrgs?: MatchingOrg[];
  multiTenant?: boolean;
}

export function SignUpForm() {
  const router = useRouter();
  const [step, setStep] = useState<"account" | "organization" | "join-or-create">("account");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [domainCheckResult, setDomainCheckResult] = useState<DomainCheckResult | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [newOrgName, setNewOrgName] = useState("");
  const [allowDomainAutoJoin, setAllowDomainAutoJoin] = useState(false);
  const [createNewOrg, setCreateNewOrg] = useState(false);

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      // Create user with Better Auth
      try {
        await authClient.signUp.email({
          email,
          password,
          name,
        });
      } catch (signupErr: any) {
        // Check if user already exists
        if (signupErr.message?.includes("already exists") || signupErr.message?.includes("UNIQUE constraint")) {
          throw new Error("An account with this email already exists. Please sign in instead.");
        }
        throw signupErr;
      }

      // Wait for session to be established
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check for existing orgs with same domain
      const domainCheckResponse = await fetch("/api/auth/check-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (domainCheckResponse.ok) {
        const domainData = await domainCheckResponse.json();
        console.log("[SIGNUP] Domain check result:", domainData);
        setDomainCheckResult(domainData);

        const hasMatchingOrgs = domainData.matchingOrgs && domainData.matchingOrgs.length > 0;

        if (domainData.multiTenant && hasMatchingOrgs) {
          // Show join-or-create step
          console.log("[SIGNUP] Going to join-or-create step");
          setStep("join-or-create");
          setIsLoading(false);
          return;
        } else if (domainData.multiTenant) {
          // No matching orgs, go to org creation
          console.log("[SIGNUP] Going to organization step");
          setStep("organization");
          setIsLoading(false);
          return;
        } else {
          console.log("[SIGNUP] multiTenant is false or undefined, falling through to single-tenant");
        }
      } else {
        console.log("[SIGNUP] Domain check failed:", domainCheckResponse.status);
      }

      // Single-tenant mode: complete signup automatically
      const postSignupResponse = await fetch("/api/auth/post-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!postSignupResponse.ok) {
        const error = await postSignupResponse.json();
        throw new Error(error.error || "Failed to setup organization");
      }

      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinOrCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (createNewOrg) {
      // User chose to create new org
      setStep("organization");
      return;
    }

    // User chose to join existing org
    if (!selectedOrgId) {
      setError("Please select an organization to join");
      return;
    }

    setIsLoading(true);

    try {
      const postSignupResponse = await fetch("/api/auth/post-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: selectedOrgId,
        }),
      });

      if (!postSignupResponse.ok) {
        const error = await postSignupResponse.json();
        throw new Error(error.error || "Failed to join organization");
      }

      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to join organization");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrganizationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!newOrgName.trim()) {
      setError("Please enter an organization name");
      return;
    }

    setIsLoading(true);

    try {
      const postSignupResponse = await fetch("/api/auth/post-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newOrganizationName: newOrgName,
          allowDomainAutoJoin,
        }),
      });

      if (!postSignupResponse.ok) {
        const error = await postSignupResponse.json();
        throw new Error(error.error || "Failed to create organization");
      }

      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to create organization");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError("");
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/auth/callback",
      });
    } catch (err) {
      setError("Failed to sign up with Google");
    }
  };

  // Step 1: Account Creation
  if (step === "account") {
    return (
      <div className="space-y-6">
        {/* Google Sign Up */}
        {process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === "true" && (
          <button
            onClick={handleGoogleSignUp}
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
              <span className="bg-white px-2 text-gray-500">Or sign up with</span>
            </div>
          </div>
        )}

        {/* Sign Up Form */}
        <form onSubmit={handleAccountSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            placeholder="John Doe"
          />
        </div>

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
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Must be at least 8 characters
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Multi-Tenant Organization Selection (for existing orgs) */}
        {domainCheckResult?.multiTenant && domainCheckResult.matchingOrgs && domainCheckResult.matchingOrgs.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Organization <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            >
              <option value="">Choose an organization...</option>
              {domainCheckResult.matchingOrgs.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Users with your email domain already exist in these organizations
            </p>
          </div>
        )}

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
          {isLoading ? "Creating account..." : "Continue"}
        </button>
      </form>

      {/* Sign In Link */}
      <div className="text-center text-sm text-gray-600">
        Already have an account?{" "}
        <a href="/auth/signin" className="text-gray-900 hover:underline">
          Sign in
        </a>
      </div>
    </div>
  );
  }

  // Step 2: Join or Create Organization
  if (step === "join-or-create") {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">Join your team</h3>
          <p className="mt-1 text-sm text-gray-600">
            Someone from your organization already has an account
          </p>
        </div>

        <form onSubmit={handleJoinOrCreateSubmit} className="space-y-4">
          {!createNewOrg ? (
            <>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900 font-medium mb-3">
                  Select an organization to join:
                </p>
                <div className="space-y-2">
                  {domainCheckResult?.matchingOrgs?.map((org) => (
                    <label
                      key={org.id}
                      className="flex items-center p-3 bg-white border border-gray-300 rounded-lg cursor-pointer hover:border-gray-900 transition-colors"
                    >
                      <input
                        type="radio"
                        name="organization"
                        value={org.id}
                        checked={selectedOrgId === org.id}
                        onChange={(e) => setSelectedOrgId(e.target.value)}
                        className="h-4 w-4 text-gray-900 focus:ring-gray-900"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-900">
                        {org.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCreateNewOrg(true)}
                className="w-full text-sm text-gray-600 hover:text-gray-900 underline"
              >
                Or create a new organization instead
              </button>
            </>
          ) : (
            <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg">
              <p className="text-sm text-gray-700">
                You chose to create a new organization.
              </p>
              <button
                type="button"
                onClick={() => setCreateNewOrg(false)}
                className="mt-2 text-sm text-gray-900 hover:underline"
              >
                ← Back to join existing organization
              </button>
            </div>
          )}

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
            {isLoading
              ? "Processing..."
              : createNewOrg
              ? "Continue to create organization"
              : "Join organization"}
          </button>
        </form>
      </div>
    );
  }

  // Step 3: Organization Setup (Create New)
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900">Create your organization</h3>
        <p className="mt-1 text-sm text-gray-600">
          You'll be the owner and can invite team members later.
        </p>
      </div>

      <form onSubmit={handleOrganizationSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Organization Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={newOrgName}
            onChange={(e) => setNewOrgName(e.target.value)}
            required
            autoFocus
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            placeholder="Acme Corp"
          />
        </div>

        <div className="flex items-start">
          <input
            type="checkbox"
            id="allowDomainAutoJoin"
            checked={allowDomainAutoJoin}
            onChange={(e) => setAllowDomainAutoJoin(e.target.checked)}
            className="mt-1 h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded"
          />
          <label htmlFor="allowDomainAutoJoin" className="ml-2 block text-sm text-gray-700">
            Allow users with <span className="font-medium">{email.split("@")[1]}</span> domain to automatically join this organization
          </label>
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
          {isLoading ? "Creating organization..." : "Create organization"}
        </button>
      </form>
    </div>
  );
}
