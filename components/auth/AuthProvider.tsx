"use client";

import React from "react";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Auth provider will be added by better-auth/react
  // For now, just pass through children
  return <>{children}</>;
}
