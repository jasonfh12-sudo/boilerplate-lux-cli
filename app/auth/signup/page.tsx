import { SignUpForm } from "@/components/auth/SignUpForm";

export default function SignUpPage() {
  // Only show this page if auth is enabled
  if (process.env.BETTER_AUTH_ENABLED !== "true") {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Create account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Get started by creating your account
          </p>
        </div>
        <div className="mt-8 bg-white py-8 px-6 shadow rounded-lg">
          <SignUpForm />
        </div>
      </div>
    </div>
  );
}
