"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import ResendDomainManager from "@/components/ResendDomainManager";

export default function IntegrationsPage() {
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);

  const integrations = [
    {
      id: "lux-email",
      name: "Lux Email",
      description: "Send transactional emails with verified custom domains powered by Resend",
      icon: Mail,
      color: "from-blue-500 to-indigo-600",
      categories: ["Email", "Communication"],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
          <p className="mt-2 text-gray-600">
            Connect and manage your integrations
          </p>
        </div>

        {/* Integration Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {integrations.map((integration) => {
            const Icon = integration.icon;
            return (
              <button
                key={integration.id}
                onClick={() =>
                  setSelectedIntegration(
                    selectedIntegration === integration.id ? null : integration.id
                  )
                }
                className={`bg-white rounded-lg border-2 p-6 hover:shadow-lg transition-all text-left ${
                  selectedIntegration === integration.id
                    ? "border-gray-900"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-lg bg-gradient-to-br ${integration.color} flex items-center justify-center text-white mb-4`}
                >
                  <Icon size={24} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {integration.name}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {integration.description}
                </p>
                <div className="flex gap-2">
                  {integration.categories.map((category) => (
                    <span
                      key={category}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Lux Email Configuration */}
        {selectedIntegration === "lux-email" && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Lux Email Configuration
              </h2>
              <p className="text-gray-600">
                Configure your email sending domains with DNS verification.
                Add your custom domain to start sending transactional emails.
              </p>
            </div>

            <ResendDomainManager />
          </div>
        )}
      </div>
    </div>
  );
}
