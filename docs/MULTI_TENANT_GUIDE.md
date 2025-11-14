# Multi-Tenant Data Isolation Guide

This interface supports multi-tenant architecture where multiple organizations can use the same application with complete data isolation.

## Critical Security Requirements

**⚠️ ALWAYS filter queries by `organizationId` in multi-tenant interfaces.**

Failing to do so will result in data leaks between organizations - a critical security vulnerability.

## How to Identify Multi-Tenant Interfaces

Check your `.env` file:
```bash
MULTI_TENANT=true   # This interface is multi-tenant
```

If `MULTI_TENANT=true`, you MUST follow the guidelines in this document.

## Session Context Helpers

We provide helper functions in `lib/session.ts` to make this easy:

### 1. `getSessionContext()`
Gets session with organizationId. Returns `null` if not authenticated.

```typescript
import { getSessionContext } from "@/lib/session";

export async function GET(req: Request) {
  const session = await getSessionContext();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  // session.organizationId is available (may be null in single-tenant)
  // session.userId is always available
  // session.roleId is available if user has a role
}
```

### 2. `requireSessionContext()`
Throws 401 if not authenticated. Use when authentication is required.

```typescript
import { requireSessionContext } from "@/lib/session";

export async function POST(req: Request) {
  const session = await requireSessionContext(); // Throws if not authenticated

  // User is guaranteed to be authenticated here
}
```

### 3. `requireOrganizationContext()`
**Use this for multi-tenant data access.** Throws 403 if user has no organizationId.

```typescript
import { requireOrganizationContext } from "@/lib/session";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { posts } from "@/schema";

export async function GET(req: Request) {
  const session = await requireOrganizationContext(); // Throws if no org

  // organizationId is guaranteed to be non-null
  const orgPosts = await db.query.posts.findMany({
    where: eq(posts.organizationId, session.organizationId)
  });

  return Response.json({ posts: orgPosts });
}
```

### 4. `validateOrganizationAccess()`
Validates that user's organizationId matches a provided ID. Prevents cross-org access.

```typescript
import { validateOrganizationAccess } from "@/lib/session";

export async function GET(
  req: Request,
  { params }: { params: { orgId: string } }
) {
  // Throws 403 if user's orgId doesn't match params.orgId
  await validateOrganizationAccess(params.orgId);

  // User is authorized to access this org's data
}
```

## Database Schema Requirements

All multi-tenant tables MUST include an `organizationId` field:

```typescript
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const posts = sqliteTable("posts", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content"),

  // REQUIRED for multi-tenant
  organizationId: text("organization_id").notNull(),

  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});
```

## Query Examples

### ✅ CORRECT - Filtered by organizationId

```typescript
import { requireOrganizationContext } from "@/lib/session";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { posts } from "@/schema";

export async function GET(req: Request) {
  const session = await requireOrganizationContext();

  // Only get posts for this user's organization
  const orgPosts = await db.query.posts.findMany({
    where: eq(posts.organizationId, session.organizationId)
  });

  return Response.json({ posts: orgPosts });
}
```

### ❌ WRONG - No organization filtering

```typescript
// SECURITY VULNERABILITY - NEVER DO THIS
export async function GET(req: Request) {
  const session = await requireSessionContext();

  // This returns ALL posts from ALL organizations!
  const allPosts = await db.query.posts.findMany();

  return Response.json({ posts: allPosts });
}
```

### ✅ CORRECT - Creating records with organizationId

```typescript
import { requireOrganizationContext } from "@/lib/session";
import { db } from "@/lib/db";
import { posts } from "@/schema";

export async function POST(req: Request) {
  const session = await requireOrganizationContext();
  const body = await req.json();

  const newPost = await db.insert(posts).values({
    id: crypto.randomUUID(),
    title: body.title,
    content: body.content,
    organizationId: session.organizationId, // REQUIRED
    createdAt: new Date(),
  }).returning();

  return Response.json(newPost);
}
```

### ✅ CORRECT - Updating with org validation

```typescript
import { requireOrganizationContext } from "@/lib/session";
import { db } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { posts } from "@/schema";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireOrganizationContext();
  const body = await req.json();

  // Update only if post belongs to user's organization
  const updated = await db.update(posts)
    .set({ title: body.title, content: body.content })
    .where(and(
      eq(posts.id, params.id),
      eq(posts.organizationId, session.organizationId) // CRITICAL
    ))
    .returning();

  if (updated.length === 0) {
    return new Response("Not found or access denied", { status: 404 });
  }

  return Response.json(updated[0]);
}
```

### ✅ CORRECT - Deleting with org validation

```typescript
import { requireOrganizationContext } from "@/lib/session";
import { db } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { posts } from "@/schema";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireOrganizationContext();

  // Delete only if post belongs to user's organization
  const deleted = await db.delete(posts)
    .where(and(
      eq(posts.id, params.id),
      eq(posts.organizationId, session.organizationId) // CRITICAL
    ))
    .returning();

  if (deleted.length === 0) {
    return new Response("Not found or access denied", { status: 404 });
  }

  return new Response(null, { status: 204 });
}
```

## Server Components

For server components (not API routes), use the same helpers:

```typescript
import { requireOrganizationContext } from "@/lib/session";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { posts } from "@/schema";

export default async function PostsPage() {
  const session = await requireOrganizationContext();

  const posts = await db.query.posts.findMany({
    where: eq(posts.organizationId, session.organizationId)
  });

  return (
    <div>
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
```

## Middleware Protection

The middleware automatically injects organization context:

- `x-organization-id` header contains the user's organizationId
- `x-user-id` header contains the user's ID
- `x-role-id` header contains the user's roleId (if any)

These headers are available in API routes via `headers()`.

## Common Mistakes to Avoid

### ❌ Trusting client-provided organizationId

```typescript
// NEVER DO THIS - Client can fake the orgId
export async function GET(req: Request) {
  const url = new URL(req.url);
  const orgId = url.searchParams.get("orgId"); // DANGEROUS

  const posts = await db.query.posts.findMany({
    where: eq(posts.organizationId, orgId) // User can access any org!
  });
}
```

### ✅ Always use session organizationId

```typescript
export async function GET(req: Request) {
  const session = await requireOrganizationContext();

  // Use organizationId from authenticated session, not client input
  const posts = await db.query.posts.findMany({
    where: eq(posts.organizationId, session.organizationId)
  });
}
```

### ❌ Forgetting to filter JOIN queries

```typescript
// WRONG - Posts are filtered but related comments are not!
const postsWithComments = await db.query.posts.findMany({
  where: eq(posts.organizationId, session.organizationId),
  with: {
    comments: true // This returns ALL comments!
  }
});
```

### ✅ Filter all related tables

```typescript
const postsWithComments = await db.query.posts.findMany({
  where: eq(posts.organizationId, session.organizationId),
  with: {
    comments: {
      where: eq(comments.organizationId, session.organizationId)
    }
  }
});
```

## Testing Multi-Tenant Isolation

Create test cases for cross-organization access:

```typescript
describe("Posts API", () => {
  it("should not allow access to other org's posts", async () => {
    // User from Org A tries to access Org B's post
    const response = await fetch(`/api/posts/${orgBPostId}`, {
      headers: {
        Cookie: `better-auth.session_token=${orgAUserToken}`
      }
    });

    expect(response.status).toBe(404); // Should not find it
  });
});
```

## Summary Checklist

For every database query in a multi-tenant interface:

- [ ] Does the table have an `organizationId` column?
- [ ] Am I using `requireOrganizationContext()` to get the session?
- [ ] Am I filtering by `session.organizationId`?
- [ ] Am I using `and()` when combining with other WHERE conditions?
- [ ] Have I filtered all JOINs and related tables?
- [ ] Am I never trusting organizationId from client input?
- [ ] Have I tested that users cannot access other orgs' data?

## Need Help?

- Review existing API routes in this codebase for examples
- Use the session helpers in `lib/session.ts`
- Ask in #engineering channel
- Read the Drizzle ORM documentation for complex queries

**Remember: Data leaks between organizations are a critical security vulnerability. Always filter by organizationId!**
