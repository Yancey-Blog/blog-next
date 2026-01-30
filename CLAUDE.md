# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Next.js 16 blog CMS with admin dashboard, OAuth authentication, dynamic theming, and version control for blog posts. Built with App Router, Server Components, and PostgreSQL (Neon).

## Development Commands

```bash
# Development
npm run dev              # Start dev server on localhost:3000

# Database (Drizzle ORM)
npm run db:generate      # Generate migrations from schema changes
npm run db:push          # Push schema directly to database (for dev)
npm run db:migrate       # Run migrations (for production)
npm run db:studio        # Open Drizzle Studio GUI

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format with Prettier

# Build
npm run build            # Production build
npm start                # Start production server
```

## Architecture

### Authentication System (better-auth)

- **OAuth only** - Google and GitHub providers (email/password disabled)
- **Two-tier admin system**:
  - **Super admins**: Email in `ADMIN_EMAILS` env var, automatically promoted to admin role
  - **Regular admins**: Role assigned via database by super admins
- **Auto-promotion**: `lib/auto-promote-admin.ts` utility called in admin layout to sync env admins with database
- **Session storage**: PostgreSQL via Drizzle adapter
- **Tables**: `users`, `sessions`, `accounts`, `verifications`
- **Important**: All table IDs use `text` type (not uuid) for better-auth compatibility

Key files:

- `lib/auth.ts` - better-auth configuration
- `lib/session.ts` - `getSession()` and `requireAuth()` helpers
- `lib/auth-utils.ts` - `isAdmin()` and `isSuperAdmin()` helpers

### Route Structure

```
app/
├── (auth)/              # Auth pages - unauthenticated layout
│   ├── login/
│   ├── register/
│   └── unauthorized/
├── (cms)/admin/         # Admin CMS - requires admin role
│   ├── layout.tsx       # Shared layout with sidebar + theme provider
│   ├── page.tsx         # Dashboard
│   ├── blog-management/ # Blog CRUD
│   ├── users/           # User role management (super admin only)
│   ├── sessions/        # Active session monitoring (super admin only)
│   └── settings/        # Theme selector (super admin only)
├── (frontend)/          # Public blog pages
│   └── blogs/[slug]/
└── api/
    ├── auth/[...all]/   # better-auth handlers
    └── trpc/[trpc]/     # Single tRPC endpoint for all API calls
```

### Database Schema (lib/db/schema.ts)

**Auth Tables** (managed by better-auth):

- `users` - id (text), email, name, role ('user'|'admin'), image
- `sessions` - id (text), userId, expiresAt, ipAddress, userAgent
- `accounts` - OAuth account links with tokens
- `verifications` - Email verification tokens

**Blog Tables**:

- `blogs` - Main blog content with slug, title, content, published status
- `blogVersions` - Version history for every blog update (title, content, publishedAt snapshots)

**Config Tables**:

- `settings` - Key-value JSON storage (id, key, value, description)

### tRPC API Layer

All API calls use tRPC for end-to-end type safety. Architecture:

**Server-side routers** (`server/routers/`):

- `blog.ts` - Blog CRUD operations (list, create, update, delete)
- `version.ts` - Version history (list, get, diff, restore)
- `upload.ts` - S3 presigned URL generation
- `admin.ts` - Admin operations (users, sessions, theme)
- `_app.ts` - Root router combining all routers

**tRPC Setup**:

- `server/trpc.ts` - Three procedure types (public, protected, admin)
- `server/context.ts` - Request context with session and user
- `app/api/trpc/[trpc]/route.ts` - Next.js API handler

**Client-side hooks** (`lib/trpc/`):

- `client.tsx` - tRPC React hooks and provider (use in Client Components)
- `server.tsx` - Server-side helpers for RSC (prefetch, hydration, direct calls)
- `query-client.ts` - Shared QueryClient factory with dehydration config
- `query-client-server.ts` - Server-side cached QueryClient

**Usage patterns**:

```typescript
// Client Components
'use client'
import { trpc } from '@/lib/trpc/client'
const { data } = trpc.blog.list.useQuery({ page: 1 })

// Server Components (prefetch + hydrate)
import { trpc, HydrateClient } from '@/lib/trpc/server'
await trpc.blog.list.prefetch({ page: 1 })
return <HydrateClient><MyComponent /></HydrateClient>

// Server Components (direct call)
import { serverClient } from '@/lib/trpc/server'
const blogs = await (await serverClient()).blog.list({ page: 1 })
```

### Service Layer Pattern

All database operations go through service classes in `lib/services/`:

- `BlogService` - CRUD, pagination, search, publish/unpublish
- `BlogVersionService` - Version snapshots on every update
- `SettingsService` - Generic key-value config (used for theme storage)

### Theme System

- **Dynamic CSS variables**: Themes stored in `settings` table, applied via `ThemeProvider`
- **Preset themes**: 5 themes defined in `lib/themes/index.ts` (Default, Neo Brutalism, Vibrant Purple, Ocean Breeze, Sunset Glow)
- **Real-time switching**: `ThemeProvider` component listens for theme changes and injects CSS variables
- **Dark mode support**: Each theme has light and dark variants
- **Color space**: Uses OKLCH for perceptually uniform colors

Key files:

- `lib/themes/index.ts` - Theme definitions
- `components/theme-provider.tsx` - Client component for CSS variable injection
- `components/theme-settings.tsx` - Theme selector UI

### Image Upload (AWS S3)

- tRPC endpoint: `trpc.upload.getPresignedUrl`
- Direct upload to S3 with presigned URLs
- Used by TinyMCE editor and image upload components

## Important Patterns

### Admin Access Control

**In tRPC routers** (automatic via procedures):

```typescript
// Protected endpoint - requires authentication
export const myRouter = router({
  protectedEndpoint: protectedProcedure
    .input(z.object({ ... }))
    .mutation(async ({ input, ctx }) => {
      // ctx.user is guaranteed to exist
      // ctx.session is guaranteed to exist
    }),

  // Admin endpoint - requires admin role
  adminEndpoint: adminProcedure
    .input(z.object({ ... }))
    .mutation(async ({ input, ctx }) => {
      // ctx.user is guaranteed to exist and be admin
    })
})
```

**In Server Components / Pages**:

```typescript
const session = await requireAuth()
if (!isAdmin(session.user)) {
  redirect('/login')
}

// Super admin only features
if (!isSuperAdmin(session.user)) {
  redirect('/unauthorized')
}
```

### Blog Version Tracking

Every blog update automatically creates a version snapshot via `BlogVersionService.createVersion()`. Called in blog update API routes before saving changes.

### Database Migrations

- **Development**: Use `npm run db:push` for quick schema sync
- **Production**: Use `npm run db:generate` then `npm run db:migrate`
- **Schema file**: `lib/db/schema.ts`
- **Migration files**: `drizzle/` directory

## Environment Variables

Required in `.env.local`:

```
DATABASE_URL=                    # Neon PostgreSQL connection string
BETTER_AUTH_SECRET=              # Random secret for better-auth
GOOGLE_CLIENT_ID=                # OAuth
GOOGLE_CLIENT_SECRET=            # OAuth
GITHUB_CLIENT_ID=                # OAuth
GITHUB_CLIENT_SECRET=            # OAuth
ADMIN_EMAILS=                    # Comma-separated super admin emails
AWS_REGION=                      # S3 for image uploads
AWS_ACCESS_KEY_ID=               # S3 credentials
AWS_SECRET_ACCESS_KEY=           # S3 credentials
AWS_S3_BUCKET_NAME=              # S3 bucket
NEXT_PUBLIC_APP_URL=             # App URL for OAuth callbacks
```

## Tech Stack

- **Framework**: Next.js 16 (App Router, Server Components, React 19)
- **API**: tRPC 11 with React Server Components support
- **Data Fetching**: TanStack Query (React Query) via @trpc/tanstack-react-query
- **Database**: PostgreSQL (Neon) + Drizzle ORM
- **Auth**: better-auth with OAuth (Google, GitHub)
- **UI**: shadcn/ui + Radix UI + Tailwind CSS
- **Editor**: TinyMCE (WYSIWYG for blog content)
- **Storage**: AWS S3 (images)
- **Validation**: Zod schemas
- **Serialization**: SuperJSON (for Date, Map, Set, etc.)

## Critical Notes

1. **Use tRPC for all API calls** - Never create new REST API routes. All backend operations should use tRPC routers in `server/routers/`. Client components use `trpc` hooks from `lib/trpc/client`, Server Components use helpers from `lib/trpc/server`.

2. **Never use better-auth hooks** - They cause "hook.handler is not a function" errors. Use `autoPromoteAdmin()` utility instead.

3. **All table IDs must be text type** - better-auth generates string IDs, not UUIDs. Do not change ID types back to uuid.

4. **Admin layout auto-promotion** - The shared `app/(cms)/admin/layout.tsx` calls `autoPromoteAdmin()` on every request to sync env admins with database roles.

5. **Theme changes require page refresh** - After updating theme via tRPC, `router.refresh()` is called to reapply CSS variables.

6. **Blog versions are immutable** - Every update creates a new version. Never edit existing versions.

7. **tRPC context in Server Components** - When using `trpc` or `serverClient` in Server Components, they automatically use Next.js `headers()` for context. No need to pass request objects manually.
