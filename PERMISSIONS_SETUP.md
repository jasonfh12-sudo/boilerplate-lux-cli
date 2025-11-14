# Custom Auth Permissions System

## Overview

This system provides flexible **Role-Based Access Control (RBAC)** with two types of permissions:

1. **Page Permissions**: Control which routes/pages users can access
2. **Data Permissions**: Control what data users can see (row-level security with filters)

## Default Roles

The system comes with two default roles:

### Admin Role
- Full access to all routes including `/admin/*`
- Can manage users, roles, and permissions
- Can invite new users as Admin or User

### User Role
- Access to normal app routes (dashboard, profile, etc.)
- **Cannot** access `/admin/*` routes
- Default role assigned to new users

## Architecture

### Database Schema

**Tables:**
- `system.interface_roles` - Custom roles per interface
- `system.interface_page_permissions` - Route access rules per role
- `system.interface_data_permissions` - Data filter rules per role
- `system.interface_user.role_id` - Links users to their role

### Backend (lux-boilerplate)

**API Routes:**
- `POST /api/admin/roles` - Create a new role
- `GET /api/admin/roles?interfaceId=xxx` - List roles
- `PUT /api/admin/roles` - Update a role
- `DELETE /api/admin/roles?id=xxx` - Delete a role

- `POST /api/admin/page-permissions` - Grant page access
- `GET /api/admin/page-permissions?roleId=xxx` - List page permissions
- `PUT /api/admin/page-permissions` - Update permission
- `DELETE /api/admin/page-permissions?id=xxx` - Revoke access

- `POST /api/admin/data-permissions` - Create data filter
- `GET /api/admin/data-permissions?roleId=xxx` - List data permissions
- `DELETE /api/admin/data-permissions?id=xxx` - Delete filter

- `POST /api/admin/users` - Assign role to user
- `GET /api/admin/users` - List all users with roles

**Middleware:**
- `/middleware.ts` - Enforces permissions on every request
- `/lib/admin-auth.ts` - Helper to protect admin routes
- `/lib/permissions.ts` - Permission checking functions

### How It Works

#### 1. User Registration
```typescript
// When a user signs up:
1. User account is created
2. Default "User" role is assigned automatically
3. User can only access non-admin routes
```

#### 2. Route Protection
```typescript
// middleware.ts checks on every request:
1. Is user authenticated?
2. What role do they have?
3. Does that role have permission for this route?
4. If no → redirect to /unauthorized
```

#### 3. Data Filtering
```typescript
// When querying data:
1. Get user's role
2. Get data permissions for that role
3. Apply filters to SQL query
4. User only sees their allowed data

// Example filter config:
{
  "conditions": [
    {
      "field": "created_by",
      "operator": "equals",
      "value": "{{current_user_id}}"
    }
  ],
  "logic": "AND"
}
```

## Setup Instructions

### 1. Run Migrations

```bash
cd /Users/jasonhenkel/Desktop/lux-boilerplate

# Make sure you have TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env.local
# Then apply the migration
turso db shell <your-db-name> < migrations/001_add_permissions_tables.sql
```

### 2. Seed Default Roles

```bash
npm run seed-roles <interface-id>
# or
INTERFACE_ID=<your-interface-id> npx tsx scripts/seed-default-roles.ts
```

This creates:
- Admin role with access to `/admin/**`, `/dashboard/**`, `/`
- User role with access to `/dashboard/**`, `/` but NOT `/admin/**`

### 3. Assign Admin Role to First User

```typescript
// Use the API or directly in database:
import { assignRoleToUser } from "@/lib/permissions";

await assignRoleToUser(userId, adminRoleId);
```

## Usage Examples

### Creating a Custom Role

```typescript
// POST /api/admin/roles
{
  "name": "Sales Rep",
  "description": "Can view and edit their own leads",
  "interfaceId": "interface_123",
  "isDefault": false
}
```

### Setting Page Permissions

```typescript
// POST /api/admin/page-permissions
{
  "roleId": "role_salesrep_123",
  "routePattern": "/leads/**",
  "canAccess": true
}

// Block admin access
{
  "roleId": "role_salesrep_123",
  "routePattern": "/admin/**",
  "canAccess": false
}
```

### Setting Data Filters

```typescript
// POST /api/admin/data-permissions
{
  "roleId": "role_salesrep_123",
  "routePattern": "/leads",
  "dataSourceType": "table",
  "dataSourceName": "leads",
  "filterConfig": {
    "conditions": [
      {
        "field": "assigned_to",
        "operator": "equals",
        "value": "{{current_user_id}}"
      }
    ],
    "logic": "AND"
  }
}
```

### Checking Permissions in Code

```typescript
import { userCanAccessRoute, isUserAdmin } from "@/lib/permissions";

// Check if user can access a route
const canAccess = await userCanAccessRoute(userId, "/admin/users");

// Check if user is admin
const isAdmin = await isUserAdmin(userId);
```

## Route Pattern Matching

Supports wildcards:
- `/dashboard` - Exact match only
- `/admin/*` - Single level (matches `/admin/users` but NOT `/admin/users/123`)
- `/admin/**` - Multi-level (matches `/admin/users` AND `/admin/users/123`)

## Data Filter Operators

- `equals`, `not_equals`
- `gt`, `gte`, `lt`, `lte`
- `contains`, `not_contains`
- `in`, `not_in`
- `is_null`, `is_not_null`

## Template Variables

Use in filter values:
- `{{current_user_id}}` - Current user's ID
- `{{user_email}}` - Current user's email
- `{{user_name}}` - Current user's name
- `{{interface_id}}` - Current interface ID

## Next Steps

1. ✅ API routes created
2. ✅ Middleware configured
3. ✅ Seed script created
4. ⏳ Run migrations
5. ⏳ Seed default roles
6. ⏳ Create admin UI pages
7. ⏳ Test end-to-end

## Files Modified/Created

### lux-boilerplate
- `auth-schema.ts` - Added `roleId` to user table
- `permissions-schema.ts` - Created (roles, permissions tables)
- `lib/permissions.ts` - Permission helper functions
- `lib/admin-auth.ts` - Admin middleware helper
- `lib/db.ts` - Include permissions schema
- `middleware.ts` - Enforce permissions
- `drizzle.config.ts` - Include both schemas
- `app/api/admin/roles/route.ts` - Role management API
- `app/api/admin/page-permissions/route.ts` - Page permission API
- `app/api/admin/data-permissions/route.ts` - Data permission API
- `app/api/admin/users/route.ts` - User/role assignment API
- `scripts/seed-default-roles.ts` - Seed Admin and User roles
- `migrations/001_add_permissions_tables.sql` - Database schema

### aa_docker (backend API)
- `services/permissionsService.js` - Permission business logic
- `middleware/orgMiddleware.js` - Extract org_id
- `routes/admin/roles/route.js` - Role management
- `routes/admin/page-permissions/route.js` - Page permissions
- `routes/admin/data-permissions/route.js` - Data permissions
