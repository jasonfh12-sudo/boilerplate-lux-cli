"use client";

import { useState, useEffect } from "react";
import { Copy, Check, RefreshCw, Loader2, ExternalLink, AlertCircle } from "lucide-react";

interface DNSRecord {
  record: string; // "SPF" or "DKIM"
  name: string;
  type: string; // "MX", "TXT", "CNAME"
  value: string;
  status: string; // "not_started", "pending", "verified", "failed"
  ttl?: string;
  priority?: number;
}

interface Domain {
  id: string;
  name: string;
  status: string; // "not_started", "pending", "verified", "failed"
  created_at: string;
  region: string;
  records: DNSRecord[];
}

export default function ResendDomainManager() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newDomain, setNewDomain] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [verifyingDomain, setVerifyingDomain] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/integrations/resend/domains");
      if (response.ok) {
        const data = await response.json();
        setDomains(data.domains || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to fetch domains");
      }
    } catch (err: any) {
      setError("Error fetching domains");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim()) {
      setError("Please enter a domain name");
      return;
    }

    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z]{2,})+$/;
    if (!domainRegex.test(newDomain)) {
      setError("Please enter a valid domain name");
      return;
    }

    try {
      setIsAdding(true);
      setError("");
      const response = await fetch("/api/integrations/resend/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newDomain.toLowerCase().trim() }),
      });

      if (response.ok) {
        setNewDomain("");
        await fetchDomains();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to add domain");
      }
    } catch (err: any) {
      setError("Error adding domain");
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveDomain = async (domainId: string, domainName: string) => {
    if (!confirm(`Are you sure you want to remove ${domainName}?`)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/integrations/resend/domains?id=${domainId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        await fetchDomains();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to remove domain");
      }
    } catch (err: any) {
      setError("Error removing domain");
      console.error(err);
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    try {
      setVerifyingDomain(domainId);
      setError("");

      const response = await fetch(
        `/api/integrations/resend/domains/${domainId}/verify`,
        { method: "POST" }
      );

      if (response.ok) {
        await fetchDomains();
        const data = await response.json();

        if (data.status === "verified") {
          // Success
        } else {
          setError("DNS records not detected yet. Please wait 5-10 minutes for DNS propagation.");
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to verify domain");
      }
    } catch (err: any) {
      setError("Error verifying domain");
      console.error(err);
    } finally {
      setVerifyingDomain(null);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified":
        return "bg-green-50 text-green-700 border-green-200";
      case "pending":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "failed":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "verified":
        return "Verified";
      case "pending":
        return "Pending";
      case "failed":
        return "Failed";
      default:
        return "Not Started";
    }
  };

  return (
    <div className="space-y-6">
      {/* API Key Check */}
      {error && error.includes("API key not configured") && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                Resend API Key Required
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                Add your Resend API key to <code className="bg-yellow-100 px-1 rounded">.env</code>:
              </p>
              <pre className="text-xs bg-yellow-100 p-2 rounded mt-2 text-yellow-900">
                RESEND_API_KEY=re_your_api_key_here
              </pre>
              <a
                href="https://resend.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-yellow-800 hover:text-yellow-900 underline mt-2 inline-flex items-center gap-1"
              >
                Get your API key from Resend <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Add Domain Form */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Add Email Domain
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddDomain()}
            placeholder="yourdomain.com"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white"
            disabled={isAdding}
          />
          <button
            onClick={handleAddDomain}
            disabled={isAdding || !newDomain.trim()}
            className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isAdding && <Loader2 className="w-4 h-4 animate-spin" />}
            {isAdding ? "Adding..." : "Add Domain"}
          </button>
        </div>
        {error && !error.includes("API key") && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
      </div>

      {/* Domain List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : domains.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-sm text-gray-500">
            No domains added yet. Add your first domain to start sending emails.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {domains.map((domain) => (
            <div
              key={domain.id}
              className="border border-gray-200 rounded-lg bg-white overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {domain.name}
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded border ${getStatusColor(
                        domain.status
                      )}`}
                    >
                      {domain.status === "verified" && <Check className="w-3 h-3" />}
                      {getStatusText(domain.status)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {domain.status !== "verified" && (
                      <button
                        onClick={() => handleVerifyDomain(domain.id)}
                        disabled={verifyingDomain === domain.id}
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        {verifyingDomain === domain.id ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Checking...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3 h-3" />
                            Check DNS
                          </>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveDomain(domain.id, domain.name)}
                      className="px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {/* DNS Records Section */}
                {domain.status !== "verified" && domain.records && domain.records.length > 0 && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      DNS Records to Add
                    </h4>
                    <p className="text-xs text-gray-600 mb-4">
                      Add these records to your DNS provider to verify your domain.
                    </p>

                    <div className="space-y-3">
                      {domain.records.map((record, index) => (
                        <div key={index} className="bg-white rounded border border-gray-200 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs font-medium px-2 py-1 rounded ${
                              record.record === "DKIM"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-blue-100 text-blue-700"
                            }`}>
                              {record.record}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(record.status)}`}>
                              {getStatusText(record.status)}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-xs">
                            <div>
                              <div className="text-gray-500 font-medium mb-1">Type</div>
                              <div className="flex items-center gap-1 bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                                <span className="font-mono text-gray-900">{record.type}</span>
                                <button
                                  onClick={() =>
                                    copyToClipboard(record.type, `type-${domain.id}-${index}`)
                                  }
                                  className="ml-auto text-gray-400 hover:text-gray-600"
                                >
                                  {copiedField === `type-${domain.id}-${index}` ? (
                                    <Check className="w-3 h-3 text-green-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500 font-medium mb-1">Name</div>
                              <div className="flex items-center gap-1 bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                                <span className="font-mono text-gray-900 truncate">{record.name}</span>
                                <button
                                  onClick={() =>
                                    copyToClipboard(record.name, `name-${domain.id}-${index}`)
                                  }
                                  className="ml-auto text-gray-400 hover:text-gray-600"
                                >
                                  {copiedField === `name-${domain.id}-${index}` ? (
                                    <Check className="w-3 h-3 text-green-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </div>
                            <div className="col-span-2">
                              <div className="text-gray-500 font-medium mb-1">Value</div>
                              <div className="flex items-center gap-1 bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                                <span className="font-mono text-gray-900 truncate text-[10px]">
                                  {record.value}
                                </span>
                                <button
                                  onClick={() =>
                                    copyToClipboard(record.value, `value-${domain.id}-${index}`)
                                  }
                                  className="ml-auto text-gray-400 hover:text-gray-600"
                                >
                                  {copiedField === `value-${domain.id}-${index}` ? (
                                    <Check className="w-3 h-3 text-green-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </div>
                            {record.priority !== undefined && (
                              <div>
                                <div className="text-gray-500 font-medium mb-1">Priority</div>
                                <div className="bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                                  <span className="font-mono text-gray-900">{record.priority}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                      <p className="text-xs text-blue-900">
                        <strong>Note:</strong> DNS changes can take 5-10 minutes to propagate
                        (up to 48 hours in rare cases). If using Cloudflare, disable proxy mode
                        (set to DNS only).
                      </p>
                    </div>
                  </div>
                )}

                {domain.status === "verified" && (
                  <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
                    <p className="text-sm text-green-800">
                      ✓ Domain verified! You can now send emails from @{domain.name}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
