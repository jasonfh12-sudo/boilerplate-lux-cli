"use client";

import { useState } from "react";
import { OrganizationTab } from "./OrganizationTab";
import { PageOverview } from "./PageOverview";
import { RolesManager } from "./RolesManager";

interface SettingsContentProps {
  authMode: string;
}

type Tab = "organization" | "page-overview" | "roles";

export function SettingsContent({ authMode }: SettingsContentProps) {
  const [activeTab, setActiveTab] = useState<Tab>("organization");

  // Only show Organization tab in multi-tenant mode
  const showOrgTab = authMode === "multi-tenant";

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab("organization")}
            className={`px-6 py-4 text-sm font-medium ${
              activeTab === "organization"
                ? "text-gray-900 border-b-2 border-gray-900"
                : "text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent"
            }`}
          >
            Organization
          </button>
          <button
            onClick={() => setActiveTab("roles")}
            className={`px-6 py-4 text-sm font-medium ${
              activeTab === "roles"
                ? "text-gray-900 border-b-2 border-gray-900"
                : "text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent"
            }`}
          >
            Roles & Permissions
          </button>
          <button
            onClick={() => setActiveTab("page-overview")}
            className={`px-6 py-4 text-sm font-medium ${
              activeTab === "page-overview"
                ? "text-gray-900 border-b-2 border-gray-900"
                : "text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent"
            }`}
          >
            Page Overview
          </button>
        </nav>
      </div>

      <div className="p-6">
        {activeTab === "organization" && (
          showOrgTab ? (
            <OrganizationTab />
          ) : (
            <div className="text-center py-8 text-gray-600">
              <p>Organization settings are only available in multi-tenant mode.</p>
              <p className="text-sm mt-2">Set AUTH_MODE=multi-tenant to enable this feature.</p>
            </div>
          )
        )}

        {activeTab === "roles" && <RolesManager />}

        {activeTab === "page-overview" && <PageOverview />}
      </div>
    </div>
  );
}
