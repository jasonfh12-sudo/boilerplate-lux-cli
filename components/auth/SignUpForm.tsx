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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [domainCheckResult, setDomainCheckResult] = useState<DomainCheckResult | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [newOrgName, setNewOrgName] = useState("");
  const [isCheckingDomain, setIsCheckingDomain] = useState(false);

  // Check domain when email changes
  useEffect(() => {
    const checkDomain = async () => {
      if (!email || !email.includes("@")) {
        setDomainCheckResult(null);
        return;
      }

      setIsCheckingDomain(true);
      try {
        const response = await fetch("/api/auth/check-domain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        if (response.ok) {
          const data = await response.json();
          setDomainCheckResult(data);

          // If single org found and multi-tenant, pre-select it
          if (data.multiTenant && data.matchingOrgs?.length === 1) {
            setSelectedOrgId(data.matchingOrgs[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to check domain:", err);
      } finally {
        setIsCheckingDomain(false);
      }
    };

    const timeoutId = setTimeout(checkDomain, 500); // Debounce 500ms
    return () => clearTimeout(timeoutId);
  }, [email]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate multi-tenant organization selection
    if (domainCheckResult?.multiTenant) {
      if (domainCheckResult.matchingOrgs && domainCheckResult.matchingOrgs.length > 0) {
        // User must select an existing org
        if (!selectedOrgId) {
          setError("Please select an organization to join");
          return;
        }
      } else {
        // User must create a new org
        if (!newOrgName.trim()) {
          setError("Please enter an organization name");
          return;
        }
      }
    }

    setIsLoading(true);

    try {
      const signupData: any = {
        email,
        password,
        name,
        callbackURL: "/",
      };

      // Add organization info if multi-tenant
      if (domainCheckResult?.multiTenant) {
        if (selectedOrgId) {
          signupData.organizationId = selectedOrgId;
        } else if (newOrgName) {
          signupData.newOrganizationName = newOrgName;
        }
      }

      await authClient.signUp.email(signupData);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError("");
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });
    } catch (err) {
      setError("Failed to sign up with Google");
    }
  };

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
      <form onSubmit={handleSignUp} className="space-y-4">
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
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            placeholder="••••••••"
          />
          <p className="mt-1 text-xs text-gray-500">
            Must be at least 8 characters
          </p>
        </div>

        {/* Single-Tenant Auto-Join Message */}
        {domainCheckResult?.canAutoJoin && !domainCheckResult.multiTenant && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              You'll automatically join the existing organization for your email domain.
            </p>
          </div>
        )}

        {/* Multi-Tenant Organization Selection */}
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

        {/* Multi-Tenant New Organization */}
        {domainCheckResult?.multiTenant && (!domainCheckResult.matchingOrgs || domainCheckResult.matchingOrgs.length === 0) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
              placeholder="Acme Corp"
            />
            <p className="mt-1 text-xs text-gray-500">
              You'll be the first user in this organization
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
          {isLoading ? "Creating account..." : "Create account"}
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
