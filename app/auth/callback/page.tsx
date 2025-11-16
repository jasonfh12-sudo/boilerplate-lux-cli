"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface MatchingOrg {
  id: string;
  name: string;
  slug: string;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [newOrgName, setNewOrgName] = useState("");
  const [allowDomainAutoJoin, setAllowDomainAutoJoin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"checking" | "join-or-create" | "create">("checking");
  const [userEmail, setUserEmail] = useState("");
  const [matchingOrgs, setMatchingOrgs] = useState<MatchingOrg[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [createNewOrg, setCreateNewOrg] = useState(false);

  useEffect(() => {
    console.log("[CALLBACK PAGE] Mounted - checking organization status");
    checkOrganizationStatus();
  }, []);

  async function checkOrganizationStatus() {
    try {
      console.log("[CALLBACK PAGE] Fetching /api/auth/check-user-org");
      // Check if user has an organization
      const response = await fetch("/api/auth/check-user-org");

      if (!response.ok) {
        console.log("[CALLBACK PAGE] Response not OK:", response.status);
        throw new Error("Failed to check organization status");
      }

      const data = await response.json();
      console.log("[CALLBACK PAGE] User org status:", data);

      if (data.hasOrganization) {
        // User already has an org, redirect to home
        console.log("[CALLBACK PAGE] Has org, redirecting to /");
        router.push("/");
        return;
      }

      // User doesn't have an org - check for domain auto-join
      setUserEmail(data.email || "");

      console.log("[CALLBACK PAGE] Checking domain for auto-join");
      const domainCheckResponse = await fetch("/api/auth/check-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });

      if (domainCheckResponse.ok) {
        const domainData = await domainCheckResponse.json();
        console.log("[CALLBACK PAGE] Domain check result:", domainData);

        const hasMatchingOrgs = domainData.matchingOrgs && domainData.matchingOrgs.length > 0;

        if (domainData.multiTenant && hasMatchingOrgs) {
          // Show join-or-create step
          console.log("[CALLBACK PAGE] Found matching orgs, showing join-or-create");
          setMatchingOrgs(domainData.matchingOrgs);
          setStep("join-or-create");
        } else {
          // No matching orgs, show create step
          console.log("[CALLBACK PAGE] No matching orgs, showing create form");
          setStep("create");
        }
      } else {
        // Domain check failed, default to create
        console.log("[CALLBACK PAGE] Domain check failed, showing create form");
        setStep("create");
      }
    } catch (err: any) {
      console.error("[CALLBACK] Error:", err);
      setError(err.message || "Failed to check organization status");
    }
  }

  async function handleJoinOrCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (createNewOrg) {
      // User chose to create new org
      setStep("create");
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
  }

  async function handleOrganizationSubmit(e: React.FormEvent) {
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
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow rounded-lg p-8">
          <div className="text-center">
            <div className="text-red-600 text-sm mb-4">{error}</div>
            <a href="/auth/signin" className="text-sm text-gray-900 hover:underline">
              Go to sign in
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (step === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Setting up your account...</div>
      </div>
    );
  }

  // Join or Create step
  if (step === "join-or-create") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white py-8 px-6 shadow rounded-lg">
            <div className="text-center mb-6">
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
                      {matchingOrgs.map((org) => (
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white py-8 px-6 shadow rounded-lg">
          <div className="text-center mb-6">
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

            {userEmail && (
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="allowDomainAutoJoin"
                  checked={allowDomainAutoJoin}
                  onChange={(e) => setAllowDomainAutoJoin(e.target.checked)}
                  className="mt-1 h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded"
                />
                <label htmlFor="allowDomainAutoJoin" className="ml-2 block text-sm text-gray-700">
                  Allow users with <span className="font-medium">{userEmail.split("@")[1]}</span> domain to automatically join this organization
                </label>
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
              {isLoading ? "Creating organization..." : "Create organization"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
