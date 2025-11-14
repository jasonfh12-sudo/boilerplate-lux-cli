import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 p-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground text-lg">
            You don't have permission to access this page.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            If you believe this is an error, please contact your administrator.
          </p>

          <div className="flex gap-4 justify-center">
            <Button asChild variant="default">
              <Link href="/">Go Home</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/auth/logout">Sign Out</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
