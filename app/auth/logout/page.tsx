"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const logout = async () => {
      try {
        await authClient.signOut();
      } catch (error) {
        console.error("Logout error:", error);
      }
      // Redirect to home after logout
      router.push("/");
    };

    logout();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Signing out...</h1>
        <p className="text-gray-600">Please wait</p>
      </div>
    </div>
  );
}
