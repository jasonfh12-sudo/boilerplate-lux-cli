# Next.js Boilerplate with Better Auth

Production-ready Next.js starter optimized for AI-generated interfaces. Includes shadcn/ui components, Better Auth, and multi-tenant architecture.

---

## Features

### 🎨 UI Components
- **19 pre-installed shadcn/ui components** (Button, Input, Card, Table, Dialog, etc.)
- **Lucide icons** for beautiful, consistent iconography
- **Tailwind CSS v3** with custom theme system
- **Dark mode ready** (class-based)

### 🔐 Authentication
- **Better Auth** pre-configured and ready to use
- **Email/password** sign up and sign in
- **Google OAuth** (ready to configure)
- **Server-side session validation**
- **Route protection middleware**
- **Multi-tenant database architecture**

### ⚡ Developer Experience
- **TypeScript** end-to-end
- **Next.js 15** with App Router
- **React 19** with Server Components
- **Auto-setup on install** - authentication configured automatically
- **Zero configuration** on Lux platform deployment

---

## Quick Start

### Using Lux CLI (Production)

```bash
lux interface init my-app
```

That's it! Authentication is automatically configured with your org-specific database.

### Manual Setup (Development)

```bash
# Clone the repository
git clone https://github.com/your-org/nextjs-boilerplate.git my-app
cd my-app

# Install dependencies (triggers auth setup)
npm install

# Create environment file
cp .env.example .env.local

# Add your Turso credentials to .env.local
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your_token_here
BETTER_AUTH_SECRET=your_secret_here

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the boilerplate.

---

## Project Structure

```
nextjs-boilerplate/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── layout.tsx                  # Root layout with Toaster
│   ├── examples/                   # Component examples
│   │   ├── dashboard/              # Dashboard example
│   │   ├── table/                  # Data table example
│   │   └── form/                   # Form example
│   ├── auth/
│   │   ├── signin/page.tsx         # Sign in page
│   │   └── signup/page.tsx         # Sign up page
│   └── api/
│       └── auth/[...all]/route.ts  # Better Auth API
│
├── components/
│   ├── ui/                         # shadcn/ui components (19 total)
│   └── SignOutButton.tsx           # Auth component
│
├── lib/
│   ├── auth.ts                     # Better Auth config (server)
│   ├── auth-client.ts              # Better Auth hooks (client)
│   ├── auth.config.ts              # Route protection rules
│   ├── db.ts                       # Database connection
│   └── utils.ts                    # Utility functions
│
├── docs/
│   ├── AUTH_GUIDE.md              # Authentication guide for AI
│   └── COMPONENT_PATTERNS.md      # Component usage patterns
│
├── scripts/
│   └── setup-auth.js              # Auto-setup script
│
├── auth-schema.ts                  # Database schema
├── drizzle.config.ts              # Drizzle ORM config
├── middleware.ts                   # Route protection
├── .env.example                    # Environment variables
└── README.md                       # This file
```

---

## Documentation

### For Developers
- **[Authentication Guide](docs/AUTH_GUIDE.md)** - Complete auth system documentation
- **[Component Patterns](docs/COMPONENT_PATTERNS.md)** - shadcn/ui component examples
- **[Environment Variables](.env.example)** - Configuration reference

### Live Examples
- Visit `/examples/dashboard` for dashboard patterns
- Visit `/examples/table` for data table patterns
- Visit `/examples/form` for form patterns

---

## Authentication

### Pre-Configured Routes

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
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth/signin");
  }

  return <div>Welcome, {session.user.name}!</div>;
}
```

### Configure Protected Routes

Edit `lib/auth.config.ts`:

```typescript
export const authConfig = {
  protectedRoutes: ["/dashboard", "/profile"],
  publicRoutes: ["/about", "/pricing"],
  authRoutes: ["/auth/signin", "/auth/signup"],
};
```

**See [AUTH_GUIDE.md](docs/AUTH_GUIDE.md) for complete documentation.**

---

## Multi-Tenant Architecture

This boilerplate uses **database-per-org** multi-tenancy:

- Each organization gets its own Turso database
- Database URL is automatically constructed from `CLERK_ORG_ID`
- Auth tables are isolated per organization
- No configuration needed on Lux platform

### How It Works

```
1. User creates interface with `lux interface init`
   ↓
2. System sets CLERK_ORG_ID in container environment
   ↓
3. Database connection automatically uses org-specific database
   Format: libsql://{orgId}-lux-ai-labs.aws-us-west-2.turso.io
   ↓
4. npm install runs setup-auth.js
   ↓
5. Auth tables created in org database
   ↓
6. Ready to use immediately!
```

---

## Tech Stack

### Core
- [Next.js 15](https://nextjs.org/) - React framework
- [React 19](https://react.dev/) - UI library
- [TypeScript](https://www.typescriptlang.org/) - Type safety

### UI
- [shadcn/ui](https://ui.shadcn.com/) - Component library
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Radix UI](https://www.radix-ui.com/) - Primitives
- [Lucide Icons](https://lucide.dev/) - Icons

### Authentication
- [Better Auth](https://www.better-auth.com/) - Auth framework
- [Drizzle ORM](https://orm.drizzle.team/) - Database ORM
- [Turso](https://turso.tech/) - SQLite database

---

## Available Scripts

```bash
# Development
npm run dev              # Start dev server

# Production
npm run build            # Build for production
npm run start            # Start production server

# Authentication
npm run setup:auth       # Run auth setup manually

# Linting
npm run lint             # Run ESLint
```

---

## Environment Variables

### Required (Production - Lux Platform)
```bash
CLERK_ORG_ID             # Set by Lux platform
TURSO_AUTH_TOKEN         # Set by Lux platform
BETTER_AUTH_SECRET       # Set by Lux platform
```

### Required (Development)
```bash
TURSO_DATABASE_URL       # Your Turso database URL
TURSO_AUTH_TOKEN         # Your Turso auth token
BETTER_AUTH_SECRET       # Generate with: openssl rand -hex 32
NEXT_PUBLIC_APP_URL      # http://localhost:3000
```

### Optional
```bash
GOOGLE_CLIENT_ID         # For Google OAuth
GOOGLE_CLIENT_SECRET     # For Google OAuth
```

See [.env.example](.env.example) for complete reference.

---

## Adding Components

Install additional shadcn/ui components:

```bash
npx shadcn@latest add calendar
npx shadcn@latest add command
npx shadcn@latest add popover
```

Browse available components: https://ui.shadcn.com/docs/components

---

## Customization

### Theme Colors

Edit `app/globals.css` to customize theme colors:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  /* ... more colors ... */
}
```

### Route Protection

Edit `lib/auth.config.ts` to control which routes require authentication.

### Session Duration

Edit `lib/auth.ts` to change session expiration:

```typescript
session: {
  expiresIn: 60 * 60 * 24 * 30, // 30 days
}
```

---

## Deployment

### Lux Platform (Recommended)

```bash
lux interface init my-app
```

Auth is automatically configured with org-specific database.

### Vercel/Other Platforms

1. Set environment variables:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `BETTER_AUTH_SECRET`
   - `NEXT_PUBLIC_APP_URL`

2. Deploy:
```bash
npm run build
```

---

## Troubleshooting

### "Database configuration missing"
- **Production**: Ensure `CLERK_ORG_ID` and `TURSO_AUTH_TOKEN` are set
- **Development**: Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in `.env.local`

### Auth setup fails on install
- Normal for local development without Turso
- Setup will run automatically when deployed to Lux platform
- Run manually: `npm run setup:auth`

### Webpack errors
- Already handled in `next.config.ts`
- If issues persist, ensure libSQL packages are in `serverExternalPackages`

---

## Contributing

This boilerplate is maintained for the Lux platform. For issues or suggestions:

1. Create an issue in the repository
2. Submit a pull request with improvements
3. Share feedback with the team

---

## License

MIT License - see LICENSE file for details.

---

## Summary

✅ **Production-ready** - Secure auth, beautiful components, optimized performance
✅ **AI-optimized** - Clear patterns, comprehensive documentation, consistent code
✅ **Multi-tenant** - Database-per-org isolation, automatic configuration
✅ **Zero config** - Works immediately on Lux platform
✅ **Developer friendly** - TypeScript, hot reload, great DX

**Ready to build beautiful, authenticated interfaces!**
