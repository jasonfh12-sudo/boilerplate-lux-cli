"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import routesAnalysis from "@/lib/routes-analysis.json";

interface Permission {
  id: string;
  routePattern: string;
  canAccess: boolean;
  createdAt: Date;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  permissions: Permission[];
}

export function RolesManager() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [newRoute, setNewRoute] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [creatingRole, setCreatingRole] = useState(false);

  const allPages = routesAnalysis.map((r: any) => r.page);

  useEffect(() => {
    fetchRoles();
  }, []);

  async function fetchRoles() {
    try {
      const response = await fetch("/api/roles");
      if (!response.ok) throw new Error("Failed to fetch roles");
      const data = await response.json();
      setRoles(data.roles);
      if (data.roles.length > 0 && !selectedRole) {
        setSelectedRole(data.roles[0]);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
    } finally {
      setLoading(false);
    }
  }

  async function addPermission(roleId: string, routePattern: string) {
    try {
      const response = await fetch(`/api/roles/${roleId}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routePattern, canAccess: true }),
      });

      if (!response.ok) throw new Error("Failed to add permission");

      await fetchRoles();
      setNewRoute("");
    } catch (error) {
      console.error("Error adding permission:", error);
    }
  }

  async function removePermission(roleId: string, routePattern: string) {
    try {
      const response = await fetch(
        `/api/roles/${roleId}/permissions?routePattern=${encodeURIComponent(routePattern)}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Failed to remove permission");

      await fetchRoles();
    } catch (error) {
      console.error("Error removing permission:", error);
    }
  }

  async function createRole() {
    if (!newRoleName.trim()) {
      alert("Please enter a role name");
      return;
    }

    setCreatingRole(true);
    try {
      const response = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRoleName,
          description: newRoleDescription || null,
          isDefault: false,
          routePatterns: ["/"],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create role");
      }

      setNewRoleName("");
      setNewRoleDescription("");
      setShowCreateDialog(false);

      await fetchRoles();
    } catch (error: any) {
      console.error("Error creating role:", error);
      alert(error.message || "Failed to create role");
    } finally {
      setCreatingRole(false);
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading roles...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Role Management</h2>
        <p className="text-gray-600">
          Configure which pages each role can access
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roles.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Pages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allPages.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Default Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {roles.find((r) => r.isDefault)?.name || "None"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        {roles.map((role) => (
          <Button
            key={role.id}
            variant={selectedRole?.id === role.id ? "default" : "outline"}
            onClick={() => setSelectedRole(role)}
            className="flex items-center gap-2"
          >
            {role.name}
            {role.isDefault && <Badge variant="secondary">Default</Badge>}
          </Button>
        ))}
        <Button
          variant="outline"
          onClick={() => setShowCreateDialog(true)}
          className="border-dashed border-2"
        >
          + Create New Role
        </Button>
      </div>

      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create New Role</CardTitle>
              <CardDescription>
                Create a custom role with specific page permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Role Name *
                </label>
                <Input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g., Manager, Viewer, Editor"
                  disabled={creatingRole}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Description (optional)
                </label>
                <Input
                  type="text"
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  placeholder="Brief description of this role"
                  disabled={creatingRole}
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                <p className="text-blue-900">
                  New roles start with access to the home page (/) only. You can add
                  more permissions after creating the role.
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateDialog(false);
                    setNewRoleName("");
                    setNewRoleDescription("");
                  }}
                  disabled={creatingRole}
                >
                  Cancel
                </Button>
                <Button onClick={createRole} disabled={creatingRole || !newRoleName.trim()}>
                  {creatingRole ? "Creating..." : "Create Role"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedRole && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {selectedRole.name}
                  {selectedRole.isDefault && (
                    <Badge variant="secondary">Default Role</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {selectedRole.description || "No description"}
                </CardDescription>
              </div>
              <Badge variant="outline">
                {selectedRole.permissions.length} permissions
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-3">Add Page Access</h3>
              <div className="flex gap-2">
                <select
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={newRoute}
                  onChange={(e) => setNewRoute(e.target.value)}
                >
                  <option value="">Select a page...</option>
                  {allPages
                    .filter(
                      (page) =>
                        !selectedRole.permissions.some(
                          (p) => p.routePattern === page
                        )
                    )
                    .map((page) => (
                      <option key={page} value={page}>
                        {page}
                      </option>
                    ))}
                  <option value="/**">/** (All pages)</option>
                  <option value="/examples/**">/examples/** (All examples)</option>
                  <option value="/auth/**">/auth/** (All auth pages)</option>
                </select>
                <Button
                  onClick={() => {
                    if (newRoute) {
                      addPermission(selectedRole.id, newRoute);
                    }
                  }}
                  disabled={!newRoute}
                >
                  Add Access
                </Button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3">Current Permissions</h3>
              {selectedRole.permissions.length === 0 ? (
                <div className="text-sm text-gray-500 italic">
                  No permissions configured. This role has no access.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {selectedRole.permissions.map((perm) => (
                    <div
                      key={perm.id}
                      className="flex items-center justify-between border border-gray-200 rounded-lg p-3 hover:border-gray-300"
                    >
                      <div className="flex items-center gap-3">
                        <svg
                          className="h-4 w-4 text-green-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <code className="text-sm font-mono">
                          {perm.routePattern}
                        </code>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          removePermission(selectedRole.id, perm.routePattern)
                        }
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-sm">Permission Patterns</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div>
            <code className="bg-blue-100 px-2 py-0.5 rounded">/dashboard</code> -
            Exact match only
          </div>
          <div>
            <code className="bg-blue-100 px-2 py-0.5 rounded">/admin/*</code> -
            Single level wildcard
          </div>
          <div>
            <code className="bg-blue-100 px-2 py-0.5 rounded">/admin/**</code> -
            Multi-level wildcard (all sub-routes)
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
