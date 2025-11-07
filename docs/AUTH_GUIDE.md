# Authentication Guide for AI

This guide explains how authentication works in this Next.js boilerplate and how to use it effectively when building features.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Common Patterns](#common-patterns)
4. [API Reference](#api-reference)
5. [Multi-Tenancy](#multi-tenancy)
6. [Best Practices](#best-practices)

---

## Quick Start

### Authentication is Pre-Configured

This boilerplate includes **Better Auth** already integrated and configured. When deployed to the Lux platform, authentication works immediately with zero setup.

### Available Routes

- `/auth/signin` - Sign in page
- `/auth/signup` - Sign up page
- `/api/auth/*` - Authentication API endpoints

### Protect a Page

```typescript
// app/dashboard/page.tsx
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  // Validate session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Redirect if not authenticated
  if (!session) {
    redirect("/auth/signin");
  }

  // User is authenticated - access user data
  const { user } = session;

  return (
    <div>
      <h1>Welcome, {user.name}!</h1>
      <p>Email: {user.email}</p>
    </div>
  );
}
```

### Use Auth in Client Component

```typescript
"use client";

import { useSession } from "@/lib/auth-client";

export function UserProfile() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (!session) {
    return <div>Not signed in</div>;
  }

  return (
    <div>
      <h2>{session.user.name}</h2>
      <p>{session.user.email}</p>
    </div>
  );
}
```

---

## Architecture Overview

### Multi-Tenant Database Architecture

This system uses **database-per-org** multi-tenancy:

1. Each organization gets its own Turso database
2. Database URL is constructed from `CLERK_ORG_ID`: `libsql://{orgId}-lux-ai-labs.aws-us-west-2.turso.io`
3. Auth tables (user, session, account) are stored in the org-specific database
4. No table prefixes needed - complete isolation

### How Auth Works

```
User Request
    ↓
1. Middleware checks for session cookie (fast)
   - If protected route + no cookie → redirect to signin
   - If auth route + has cookie → redirect to dashboard
    ↓
2. Page component validates session (secure)
   - Queries database using session token
   - Returns user data if valid
   - Redirect if invalid/expired
    ↓
3. Render page with user context
```

### Session Management

- **Storage**: Database-backed (not pure JWT)
- **Token**: 32-byte random hex string
- **Cookie**: HTTP-only, Secure, SameSite=Lax
- **Expiration**: 7 days (configurable)
- **Rotation**: New token on each sign-in

---

## Common Patterns

### Pattern 1: Protected Server Component

Use this for pages that should only be accessible when logged in:

```typescript
// app/protected-page/page.tsx
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth/signin");
  }

  return <div>Protected content for {session.user.email}</div>;
}
```

### Pattern 2: Optional Auth

Show different content based on auth status:

```typescript
// app/page.tsx
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Link from "next/link";

export default async function HomePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    return (
      <div>
        <h1>Welcome back, {session.user.name}!</h1>
        <Link href="/dashboard">Go to Dashboard</Link>
      </div>
    );
  }

  return (
    <div>
      <h1>Welcome!</h1>
      <Link href="/auth/signin">Sign In</Link>
    </div>
  );
}
```

### Pattern 3: Sign Out Button

```typescript
// components/SignOutButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/auth/signin");
  };

  return <Button onClick={handleSignOut}>Sign Out</Button>;
}
```

### Pattern 4: Protect API Route

```typescript
// app/api/data/route.ts
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Return user-specific data
  return NextResponse.json({
    data: "Secret data for " + session.user.email
  });
}
```

### Pattern 5: User Profile Form

```typescript
"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export function ProfileForm() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [name, setName] = useState(session?.user.name || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Update user profile
    const res = await fetch("/api/user/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (res.ok) {
      toast({ title: "Profile updated!" });
    } else {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
      />
      <Button type="submit">Save Changes</Button>
    </form>
  );
}
```

---

## API Reference

### Server-Side (lib/auth.ts)

#### `auth.api.getSession()`

Get current session from server component or API route.

```typescript
const session = await auth.api.getSession({
  headers: await headers(),
});

if (session) {
  console.log(session.user.id);
  console.log(session.user.email);
  console.log(session.user.name);
  console.log(session.user.image);
  console.log(session.session.expiresAt);
}
```

### Client-Side (lib/auth-client.ts)

#### `useSession()`

React hook to access session in client components.

```typescript
const { data: session, isPending, error } = useSession();
```

#### `authClient.signOut()`

Sign out the current user.

```typescript
await authClient.signOut();
```

#### `authClient.signIn.email()`

Sign in with email/password.

```typescript
await authClient.signIn.email({
  email: "user@example.com",
  password: "password123",
});
```

#### `authClient.signUp.email()`

Create new account with email/password.

```typescript
await authClient.signUp.email({
  email: "user@example.com",
  password: "password123",
  name: "John Doe",
});
```

---

## Multi-Tenancy

### How It Works

1. **Organization ID**: Each org has a `CLERK_ORG_ID` (e.g., `org_ABC123`)
2. **Database URL**: Automatically constructed as `libsql://orgabc123-lux-ai-labs.aws-us-west-2.turso.io`
3. **Auth Tables**: Stored in org-specific database
4. **Isolation**: Complete data isolation between orgs

### Database Connection

The database connection (`lib/db.ts`) automatically:
- Reads `CLERK_ORG_ID` from environment
- Sanitizes it (removes underscores, lowercase)
- Constructs the org-specific Turso URL
- Connects using shared `TURSO_AUTH_TOKEN`

### For Development

When testing locally without `CLERK_ORG_ID`, set `TURSO_DATABASE_URL` explicitly:

```bash
# .env.local
TURSO_DATABASE_URL=libsql://my-test-db.turso.io
TURSO_AUTH_TOKEN=your_token
```

---

## Best Practices

### 1. Always Validate on Server

Never trust client-side auth state for security decisions:

```typescript
// ❌ BAD - Client component making decision
"use client";
export function DeleteButton() {
  const { data: session } = useSession();
  if (!session?.user.isAdmin) return null;
  return <button onClick={deleteEverything}>Delete All</button>;
}

// ✅ GOOD - Server validates, API enforces
export async function DELETE() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // Perform deletion
}
```

### 2. Use Middleware for Routes

Configure route protection in `lib/auth.config.ts`:

```typescript
export const authConfig = {
  protectedRoutes: [
    "/dashboard",
    "/profile",
    "/settings",
  ],
  publicRoutes: [
    "/about",
    "/pricing",
  ],
  authRoutes: [
    "/auth/signin",
    "/auth/signup",
  ],
};
```

### 3. Handle Loading States

```typescript
"use client";

export function UserInfo() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <Skeleton className="h-8 w-32" />;
  }

  if (!session) {
    return <Link href="/auth/signin">Sign In</Link>;
  }

  return <p>Hello, {session.user.name}</p>;
}
```

### 4. Refresh After Mutations

After updating user data, refresh the session:

```typescript
"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function UpdateProfile() {
  const router = useRouter();
  const { data: session } = useSession();

  const handleUpdate = async () => {
    await fetch("/api/user/update", {
      method: "POST",
      body: JSON.stringify({ name: "New Name" }),
    });

    // Refresh to get updated session
    router.refresh();
  };

  return <button onClick={handleUpdate}>Update</button>;
}
```

### 5. Error Handling

```typescript
"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function SignInForm() {
  const router = useRouter();
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      await authClient.signIn.email({ email, password });
      router.push("/dashboard");
    } catch (err) {
      setError("Invalid email or password");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      {error && <p className="text-destructive">{error}</p>}
    </form>
  );
}
```

---

## Configuration

### Route Protection

Edit `lib/auth.config.ts` to control which routes require authentication:

```typescript
export const authConfig = {
  protectedRoutes: ["/dashboard", "/profile"],
  authRoutes: ["/auth/signin", "/auth/signup"],
  publicRoutes: ["/about", "/pricing"],
  redirects: {
    afterSignIn: "/dashboard",
    toSignIn: "/auth/signin",
  },
};
```

### Session Settings

Edit `lib/auth.ts` to configure session behavior:

```typescript
export const auth = betterAuth({
  // ... other config
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update every 24 hours
  },
});
```

---

## Troubleshooting

### "Database configuration missing"

Make sure environment variables are set:
- Production: `CLERK_ORG_ID` and `TURSO_AUTH_TOKEN`
- Development: `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`

### "Unauthorized" on protected routes

Session might be expired. Sign out and sign back in.

### Webpack errors with LibSQL

Already handled in `next.config.ts`. If you see errors, ensure the config includes libSQL externals.

---

## Summary

✅ **Auth is pre-configured** - Works immediately on Lux platform
✅ **Multi-tenant by default** - Each org has isolated data
✅ **Server-side validation** - Secure session checks
✅ **Route protection** - Centralized in auth.config.ts
✅ **shadcn/ui components** - Beautiful auth pages included

Build authenticated features with confidence!
