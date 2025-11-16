"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AcceptInviteCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    acceptInvitation();
  }, []);

  async function acceptInvitation() {
    try {
      // Get the invitation token from localStorage
      const invitationToken = localStorage.getItem("pendingInvitationToken");

      if (!invitationToken) {
        throw new Error("No pending invitation found");
      }

      console.log("[ACCEPT-INVITE-CALLBACK] Accepting invitation:", invitationToken);

      // Accept the invitation
      const response = await fetch("/api/auth/organization/accept-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitationId: invitationToken,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to accept invitation");
      }

      // Clear the pending invitation
      localStorage.removeItem("pendingInvitationToken");

      console.log("[ACCEPT-INVITE-CALLBACK] Invitation accepted, redirecting to home");

      // Redirect to home
      router.push("/");
    } catch (err: any) {
      console.error("[ACCEPT-INVITE-CALLBACK] Error:", err);
      setError(err.message || "Failed to accept invitation");
      setProcessing(false);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow rounded-lg p-8">
          <div className="text-center">
            <div className="text-red-600 text-sm mb-4">{error}</div>
            <a
              href="/auth/signin"
              className="text-sm text-gray-900 hover:underline"
            >
              Go to sign in
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-gray-600">
        {processing ? "Accepting invitation..." : "Redirecting..."}
      </div>
    </div>
  );
}
