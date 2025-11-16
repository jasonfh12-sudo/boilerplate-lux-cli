# Environment Variables Reference

Complete reference of all environment variables used in the Lux platform, organized by scope.

---

## 🌍 Global Level (Container/Platform-wide)

These are set at the Docker container level and shared across ALL organizations and interfaces.

### Core Infrastructure

```bash
# Organization ID from Clerk
# Used to construct org-specific database URLs
# Format: org_{random_id}
CLERK_ORG_ID=org_2abc123def456

# Turso authentication token
# Single token works for all org databases
TURSO_AUTH_TOKEN=your_turso_auth_token

# Organization data directory
# Default: /org
ORG_DIR=/org
```

### API Services

```bash
# Anthropic Claude API key (for agents)
ANTHROPIC_API_KEY=sk-ant-xxx

# Upstash Redis (for caching, queues, sessions)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

### Platform Services

```bash
# Main API server port
# Default: 8000
API_PORT=8000

# Interface proxy API port
# Default: 8001
INTERFACE_API_PORT=8001

# GitHub Personal Access Token (for repo creation/management)
GITHUB_PAT=ghp_xxx
```

### Email (Platform-level)

```bash
# Resend API Key (platform-wide email service)
# All interfaces send emails through this account
# Users add their domains to this Resend account via domain verification
RESEND_API_KEY=re_xxx

# Default sender email (fallback)
# Used if interface doesn't specify RESEND_FROM_EMAIL
RESEND_FROM_EMAIL=noreply@luxplatform.com
```

### Storage (Platform-level)

```bash
# Cloudflare R2 Object Storage
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_KV_API_TOKEN=your_kv_token
```

---

## 🏢 Org Level (Per Organization)

These are stored in the `system.secrets` table with `source='endpoint'` and are available to ALL interfaces within an organization. They are written to each interface's `.env.local` file as `endpoint-{SECRET_NAME}`.

### How to Set Org-Level Secrets

Via CLI:
```bash
lux secrets set SECRET_NAME "value here"
```

Via lux-website API:
```bash
POST /api/org/secrets
{
  "key": "SECRET_NAME",
  "value": "secret_value",
  "source": "endpoint"
}
```

### Common Org-Level Secrets

```bash
# Shared OAuth credentials (if all interfaces in org use same OAuth app)
# endpoint-GOOGLE_CLIENT_ID
# endpoint-GOOGLE_CLIENT_SECRET
# endpoint-GITHUB_CLIENT_ID
# endpoint-GITHUB_CLIENT_SECRET

# Shared API keys (if org shares API quotas)
# endpoint-OPENAI_API_KEY
# endpoint-STRIPE_API_KEY

# Shared email configuration (if org-specific email domain)
# endpoint-RESEND_FROM_EMAIL=noreply@orgdomain.com

# Org-wide feature flags
# endpoint-ENABLE_ANALYTICS=true
# endpoint-MAINTENANCE_MODE=false
```

### Access in Interface Code

```typescript
// Accessed as environment variables with 'endpoint-' prefix
const googleClientId = process.env['endpoint-GOOGLE_CLIENT_ID'];
const stripeKey = process.env['endpoint-STRIPE_API_KEY'];
```

---

## 🖼️ Interface Level (Per Interface)

These are stored in the `system.secrets` table with `source='interface'` and `interface_id={interface_id}`. They are written to that specific interface's `.env.local` file (prefix is stripped).

### How to Set Interface-Level Secrets

Via CLI (from within interface directory):
```bash
# If INTERFACE_ID is set in environment
lux secrets set SECRET_NAME "value here"
```

Via lux-website API:
```bash
POST /api/org/secrets
{
  "key": "{interfaceId}__SECRET_NAME",
  "value": "secret_value",
  "source": "interface",
  "interfaceId": "abc123"
}
```

### Core Authentication

```bash
# Better Auth secret key (32+ characters)
# Used for signing tokens and sessions
# Generated automatically during npm install
BETTER_AUTH_SECRET=your_32_char_secret_here

# Application URL
# Used for OAuth callbacks and email links
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Auth type configuration
# Values: "none" | "single-tenant" | "multi-tenant"
AUTH_TYPE=multi-tenant
```

### Database (Interface-specific)

```bash
# Optional: Override database URL
# By default, uses CLERK_ORG_ID to construct URL
# Only needed for testing with non-org database
TURSO_DATABASE_URL=libsql://custom-db.turso.io
```

### OAuth Providers (Interface-specific)

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true

# GitHub OAuth
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
NEXT_PUBLIC_GITHUB_OAUTH_ENABLED=true
```

### Email Configuration (Interface-specific)

```bash
# Sender email address (must be from verified domain)
# Example: noreply@yourdomain.com
# This domain must be verified via Lux Email integration
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Email reply-to address (optional)
RESEND_REPLY_TO=support@yourdomain.com

# Email template IDs (Resend templates)
# For password reset email
RESEND_TEMPLATE_PASSWORD_RESET=template_xxx

# For organization invitation email
RESEND_TEMPLATE_ORG_INVITE=template_xxx

# For email verification
RESEND_TEMPLATE_EMAIL_VERIFICATION=template_xxx

# For welcome email
RESEND_TEMPLATE_WELCOME=template_xxx
```

### Application Branding (Interface-specific)

```bash
# Application name
# Used in emails and UI
NEXT_PUBLIC_APP_NAME=My App

# Support email
# Shown in emails and help sections
SUPPORT_EMAIL=support@yourdomain.com
```

### Feature Flags (Interface-specific)

```bash
# Enable/disable specific features
NEXT_PUBLIC_ENABLE_SIGNUP=true
NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH=true
NEXT_PUBLIC_ENABLE_GITHUB_OAUTH=true
NEXT_PUBLIC_ENABLE_MAGIC_LINK=true
```

### Third-Party Services (Interface-specific)

```bash
# Analytics
NEXT_PUBLIC_ANALYTICS_ID=GA_xxx

# Error tracking
SENTRY_DSN=https://xxx@sentry.io/xxx

# Custom API keys
OPENAI_API_KEY=sk-xxx
STRIPE_API_KEY=sk_test_xxx
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
```

---

## 📋 How It Works

### 1. Setting Secrets

**Global (Container-level):**
- Set via Docker environment variables
- Managed by platform infrastructure
- Available to all code in the container

**Org-level:**
- Set via `lux secrets set` or lux-website API
- Stored in `system.secrets` table with `source='endpoint'`
- Encrypted at rest

**Interface-level:**
- Set via `lux secrets set` (when in interface context) or lux-website API
- Stored in `system.secrets` table with `source='interface'`
- Encrypted at rest

### 2. Loading Secrets

When an interface starts:

1. **npm install** runs (if node_modules missing)
   - `setup-auth.js` postinstall script generates `BETTER_AUTH_SECRET`
   - Secret is saved to database with `source='interface'`

2. **reload-secrets** is called automatically
   - Fetches all secrets from `system.secrets` table
   - Decrypts secrets
   - Writes to interface's `.env.local` file:
     - Org-level: `endpoint-SECRET_NAME=value`
     - Interface-level: `SECRET_NAME=value`

3. **Interface dev server starts**
   - Reads `.env.local` file
   - Environment variables are available to Next.js app

### 3. Updating Secrets

When secrets are updated (via lux-website or CLI):

1. Secret is updated in `system.secrets` table
2. `POST /reload-secrets/{interfaceId}` is called
3. New secrets are written to `.env.local`
4. Interface dev server is restarted
5. New secrets are available immediately

---

## 🔐 Security Notes

1. **Never commit `.env.local` to git** - This file is auto-generated and contains decrypted secrets

2. **Secrets are encrypted at rest** - All secrets in `system.secrets` table are encrypted using platform encryption key

3. **Access control** - Org-level secrets are only accessible to interfaces within that org

4. **Audit trail** - All secret operations are logged with timestamps and user info

---

## 📝 Migration Checklist

When deploying to production or new environment:

### Platform (Global)
- [ ] Set `CLERK_ORG_ID`
- [ ] Set `TURSO_AUTH_TOKEN`
- [ ] Set `ANTHROPIC_API_KEY`
- [ ] Set `UPSTASH_REDIS_REST_URL`
- [ ] Set `UPSTASH_REDIS_REST_TOKEN`
- [ ] Set `RESEND_API_KEY` (platform-wide)
- [ ] Set `GITHUB_PAT`
- [ ] Set storage credentials (R2, Cloudflare)

### Organization
- [ ] Set org-wide OAuth credentials (if sharing)
- [ ] Set org-wide API keys (if sharing quotas)
- [ ] Set org-specific email domain/configuration

### Interface
- [ ] Set `AUTH_TYPE` (none/single-tenant/multi-tenant)
- [ ] Set `NEXT_PUBLIC_APP_URL`
- [ ] Set `RESEND_FROM_EMAIL` (verified domain)
- [ ] Set email template IDs
- [ ] Set OAuth credentials (if per-interface)
- [ ] Set `NEXT_PUBLIC_APP_NAME`
- [ ] Set feature flags
- [ ] Set third-party service keys
- [ ] `BETTER_AUTH_SECRET` is auto-generated on install

---

## 🚀 Development Setup

For local development (outside Lux platform):

1. Copy `.env.example` to `.env.local`
2. Create Turso database: `turso db create my-test-db`
3. Get credentials:
   ```bash
   turso db show my-test-db --url
   turso auth token
   ```
4. Fill in `.env.local`:
   ```bash
   TURSO_DATABASE_URL=libsql://my-test-db.turso.io
   TURSO_AUTH_TOKEN=your_token_here
   BETTER_AUTH_SECRET=$(openssl rand -hex 32)
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   RESEND_API_KEY=re_xxx
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   ```
5. Run: `npm install && npm run dev`

---

## 🔄 Environment Variable Precedence

When the same variable is defined at multiple levels:

1. **Interface `.env.local`** (highest priority)
2. **Org-level secrets** (written as `endpoint-*`)
3. **Global environment** (container-level)
4. **Default values** in code (lowest priority)

Example:
```bash
# If RESEND_API_KEY is set in:
# - Global: re_global_key
# - Org secrets: re_org_key (written as endpoint-RESEND_API_KEY)
# - Interface .env.local: re_interface_key

# Interface will use: re_interface_key
# Code can check: process.env.RESEND_API_KEY || process.env['endpoint-RESEND_API_KEY'] || globalFallback
```

---

## 📚 Related Documentation

- [Better Auth Configuration](https://better-auth.com)
- [Turso Database Setup](https://turso.tech/docs)
- [Resend Email API](https://resend.com/docs)
- [Lux CLI Reference](./CLI_REFERENCE.md)
