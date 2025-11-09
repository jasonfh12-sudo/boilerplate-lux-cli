import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UsersTab } from "@/components/UsersTab";

export default async function SettingsPage() {
  // Require authentication
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your application settings and users
          </p>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button className="px-6 py-4 text-sm font-medium text-indigo-600 border-b-2 border-indigo-600">
                Users
              </button>
              {/* Add more tabs here later */}
            </nav>
          </div>

          <div className="p-6">
            <UsersTab />
          </div>
        </div>
      </div>
    </div>
  );
}
