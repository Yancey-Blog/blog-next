# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Next.js 16 blog CMS with admin dashboard, OAuth authentication, dynamic theming, full-text search, analytics tracking, and version control for blog posts. Built with App Router, Server Components, and PostgreSQL (Neon).

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
- **Whitelist-based access control**:
  - Only emails in `ADMIN_EMAILS` environment variable can login
  - Non-whitelisted users are blocked at OAuth callback and their session/user records are deleted
  - No role field in database - authentication is purely whitelist-based
  - Add collaborators by editing `ADMIN_EMAILS` in `.env.local`
- **OAuth hooks**: `lib/auth.ts` implements `after` hook to block unauthorized users during sign-in
- **Session storage**: PostgreSQL via Drizzle adapter
- **Tables**: `users`, `sessions`, `accounts`, `verifications`
- **Important**: All table IDs use `text` type (not uuid) for better-auth compatibility

Key files:

- `lib/auth.ts` - better-auth configuration with OAuth access control hooks
- `lib/session.ts` - `getSession()` and `requireAuth()` helpers
- `lib/auth-utils.ts` - `getAdminEmails()` and `isAdminEmail()` helpers

### Route Structure

```
app/
├── (auth)/              # Auth pages - unauthenticated layout
│   ├── login/
│   ├── register/
│   └── unauthorized/
├── (cms)/admin/         # Admin CMS - requires authentication (whitelisted emails only)
│   ├── layout.tsx       # Shared layout with sidebar + theme provider
│   ├── page.tsx         # Dashboard
│   ├── blog-management/ # Blog CRUD
│   ├── users/           # User management
│   ├── sessions/        # Active session monitoring
│   └── settings/        # Theme selector
├── (frontend)/          # Public blog pages
│   └── blogs/[slug]/
└── api/
    ├── auth/[...all]/   # better-auth handlers
    └── trpc/[trpc]/     # Single tRPC endpoint for all API calls
```

### Database Schema (lib/db/schema.ts)

**Auth Tables** (managed by better-auth):

- `users` - id (text), email, name, image, emailVerified, createdAt, updatedAt
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
import { trpc } from '@/_trpc/client'
const { data } = trpc.blog.list.useQuery({ page: 1 })

// Server Components (prefetch + hydrate)
import { trpc, HydrateClient } from '@/_trpc/server'
await trpc.blog.list.prefetch({ page: 1 })
return <HydrateClient><MyComponent /></HydrateClient>

// Server Components (direct call)
import { serverClient } from '@/_trpc/server'
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
- **Dark mode support**: Each theme has light and dark variants (light/dark mode toggle in footer)
- **Color space**: Uses OKLCH for perceptually uniform colors
- **UI Location**: Theme mode switcher (light/dark/system) is located in the footer

Key files:

- `lib/themes/index.ts` - Theme definitions
- `components/theme-provider.tsx` - Client component for CSS variable injection
- `components/theme-settings.tsx` - Theme selector UI (admin)
- `components/theme-mode-switcher.tsx` - Light/dark/system mode switcher (frontend footer)
- `components/frontend-footer.tsx` - Footer with theme switcher

### Search Integration (Algolia)

- **Full-text search**: Powered by Algolia InstantSearch for real-time results
- **Search UI**: Slide-out drawer from right side with results preview
- **Features**:
  - Instant search as you type
  - Content snippets with highlighting
  - Tag filtering
  - Auto-close on navigation
  - Keyboard shortcuts (ESC to close)
- **Analytics integration**: Search queries automatically tracked via analytics

Key files:

- `components/algolia-search.tsx` - Search box and results drawer component
- `components/frontend-header.tsx` - Header with search box integration

Environment variables:

```bash
NEXT_PUBLIC_ALGOLIA_SEARCH_APP_ID=       # Algolia application ID
NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=      # Search-only API key (public)
NEXT_PUBLIC_ALGOLIA_SEARCH_INDEX_NAME=   # Index name
ALGOLIA_ADMIN_API_KEY=                   # Admin API key (server-side only)
```

### Analytics Integration (Google Analytics / Tag Manager)

- **Optimized integration**: Uses `@next/third-parties/google` for better performance
- **Dual support**: Google Analytics 4 (GA4) or Google Tag Manager (GTM)
- **Type-safe tracking**: Event tracking utilities in `lib/analytics.ts`
- **Auto-tracking**: Page views, searches, and custom events

Key files:

- `app/google-analytics.tsx` - GA4/GTM component integration
- `lib/analytics.ts` - Type-safe event tracking utilities

**Common tracking functions**:

```typescript
import { analytics } from '@/lib/analytics'

analytics.trackPageView('/blog/post-slug')
analytics.trackBlogView('post-id', 'Post Title')
analytics.trackSearch('search query', 42)
analytics.trackButtonClick('button-name', 'location')
analytics.trackThemeChange('dark')
```

Environment variables (choose one):

```bash
# Option 1: Direct GA4 integration (simple)
NEXT_PUBLIC_GA_KEY=G-XXXXXXXXXX

# Option 2: Google Tag Manager (recommended for multiple tags)
NEXT_PUBLIC_GTM_ID=GTM-XXXXXX
```

See `GOOGLE_ANALYTICS_MIGRATION.md` for migration guide from Universal Analytics.

### Image Upload (AWS S3)

- tRPC endpoint: `trpc.upload.getPresignedUrl`
- Direct upload to S3 with presigned URLs
- Used by TinyMCE editor and image upload components

### PWA Support (Progressive Web App)

- **App-like experience**: Full PWA support with manifest and service worker capabilities
- **Multi-size icons**: Comprehensive icon set (16x16 to 512x512) for various devices
- **Install prompt**: Users can install the blog as a standalone app on mobile/desktop
- **Offline capabilities**: Service worker files (sw.js, workbox) are git-ignored and generated at build time

Key files:

- `public/manifest.json` - PWA manifest with app metadata, theme colors, and icons
- `public/icon-*.png` - App icons in multiple sizes (72, 96, 128, 144, 152, 192, 384, 512)
- `public/apple-icon.png` - iOS-specific icon
- `public/favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png` - Browser favicons
- `.gitignore` - Excludes generated service worker files (sw.js, workbox-*.js, worker-*.js)

**Manifest configuration**:

```json
{
  "name": "Yancey Blog",
  "short_name": "Yancey",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#000000",
  "icons": [...]
}
```

### Error Monitoring (Sentry)

- **Full-stack tracking**: Error monitoring across client, edge, and server environments
- **Automatic error capture**: Unhandled exceptions and promise rejections
- **Performance monitoring**: Track API latency, page load times, and user interactions
- **Release tracking**: Correlate errors with deployments via source maps
- **Environment separation**: Different DSN for dev/staging/production

Key files:

- `sentry.client.config.ts` - Client-side Sentry configuration (browser errors, user interactions)
- `sentry.edge.config.ts` - Edge runtime Sentry configuration (middleware, edge functions)
- `sentry.server.config.ts` - Server-side Sentry configuration (API routes, SSR errors)

Environment variables:

```bash
NEXT_PUBLIC_SENTRY_DSN=                      # Sentry project DSN (client-visible)
SENTRY_AUTH_TOKEN=                           # Auth token for source map upload (optional)
SENTRY_ORG=                                  # Sentry organization slug (optional)
SENTRY_PROJECT=                              # Sentry project slug (optional)
```

**Sentry features enabled**:
- Automatic error boundaries for React components
- API route error tracking
- Performance tracing for database queries
- User context (authenticated user info)
- Breadcrumbs for debugging user flows

### Frontend Design System

**Homepage** (`app/(frontend)/page.tsx`):
- **Hero section**: Full-viewport hero with background image and glitch text animation
- **Latest articles grid**: 3-column responsive grid showcasing newest published posts
- **Card layout**: Each article card displays cover image, tags, title, summary, author, and stats
- **Glitch effect**: Custom CSS animation for hero text (data-attribute driven)

**Blog listing** (`app/(frontend)/post/page.tsx`):
- **Search functionality**: Full-text search with enhanced UI (rounded search bar)
- **Grid layout**: 3-column responsive grid (12 posts per page)
- **Rich cards**: Cover images, tags (max 2 visible), author avatar, date, view/like stats
- **Pagination**: Bottom pagination for navigating through articles

**Shared components**:
- `LazyLoadImage` - Optimized image loading with lazy loading and blur placeholder
- `FrontendHeader` - Header with Algolia search integration
- `FrontendFooter` - Footer with theme mode switcher (light/dark/system)

**SEO enhancements**:
- Comprehensive Open Graph tags for social sharing
- Twitter card metadata
- Structured metadata with templates (title, description)
- Apple web app meta tags for iOS
- Robots.txt for search engine crawlers
- Sitemap XML for better indexing

Key files:
- `components/lazy-load-image.tsx` - Image component with lazy loading and optimization
- `app/(frontend)/layout.tsx` - Layout with SEO metadata, Analytics, and Footer
- `app/globals.css` - Global styles including glitch animation keyframes
- `public/robots.txt` - Search engine crawler directives
- `public/sitemap-index.xml` - XML sitemap for search engines

## Important Patterns

### Admin Access Control

**In tRPC routers** (automatic via procedures):

```typescript
// Protected endpoint - requires authentication
// All authenticated users are whitelisted admins
export const myRouter = router({
  protectedEndpoint: protectedProcedure
    .input(z.object({ ... }))
    .mutation(async ({ input, ctx }) => {
      // ctx.user is guaranteed to exist
      // ctx.session is guaranteed to exist
    }),

  // Admin endpoint - alias for protectedProcedure
  // All authenticated users are admins (whitelist enforced at OAuth)
  adminEndpoint: adminProcedure
    .input(z.object({ ... }))
    .mutation(async ({ input, ctx }) => {
      // ctx.user is guaranteed to exist and be whitelisted admin
    })
})
```

**In Server Components / Pages**:

```typescript
// Simply require authentication - all authenticated users are whitelisted admins
const session = await requireAuth()

// Optional: Check if an email is in the whitelist (before OAuth)
import { isAdminEmail } from '@/lib/auth-utils'
if (!isAdminEmail(email)) {
  // Block access
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

```bash
# Database
DATABASE_URL=                                # Neon PostgreSQL connection string
REDIS_URL=                                   # Redis connection string (optional)

# Application
NEXT_PUBLIC_APP_URL=                         # App URL for OAuth callbacks

# Authentication
BETTER_AUTH_SECRET=                          # Random secret for better-auth (openssl rand -base64 32)
ADMIN_EMAILS=                                # Comma-separated admin emails

# OAuth Providers
GOOGLE_CLIENT_ID=                            # Google OAuth credentials
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=                            # GitHub OAuth credentials
GITHUB_CLIENT_SECRET=

# Content Editor
NEXT_PUBLIC_TINYMCE_API_KEY=                 # TinyMCE API key

# AWS S3 (Image uploads)
AWS_REGION=                                  # S3 region (e.g., us-east-1)
AWS_ACCESS_KEY_ID=                           # S3 credentials
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET_NAME=                          # S3 bucket name

# Search (Algolia)
NEXT_PUBLIC_ALGOLIA_SEARCH_APP_ID=           # Algolia application ID
ALGOLIA_APPLICATION_ID=                      # Same as above (for server-side)
NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=          # Search-only API key (public)
ALGOLIA_ADMIN_API_KEY=                       # Admin API key (server-side indexing)
NEXT_PUBLIC_ALGOLIA_SEARCH_INDEX_NAME=       # Index name
ALGOLIA_SEARCH_INDEX=                        # Same as above (for server-side)

# Analytics (choose one)
NEXT_PUBLIC_GA_KEY=                          # Google Analytics 4 measurement ID (G-XXXXXXXXXX)
# OR
NEXT_PUBLIC_GTM_ID=                          # Google Tag Manager container ID (GTM-XXXXXX)

# Monitoring
NEXT_PUBLIC_SENTRY_DSN=                      # Sentry error tracking DSN
NEXT_PUBLIC_DISCUSSION_KEY=                  # Discussion system key (optional)
```

See `.env.example` for detailed documentation on each variable.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Server Components, React 19)
- **API**: tRPC 11 with React Server Components support
- **Data Fetching**: TanStack Query (React Query) via @trpc/tanstack-react-query
- **Database**: PostgreSQL (Neon) + Drizzle ORM
- **Cache**: Redis (optional, for caching)
- **Auth**: better-auth with OAuth (Google, GitHub)
- **UI**: shadcn/ui + Radix UI + Tailwind CSS
- **Editor**: TinyMCE (WYSIWYG for blog content)
- **Search**: Algolia InstantSearch (full-text search)
- **Analytics**: Google Analytics 4 / Google Tag Manager via @next/third-parties
- **Monitoring**: Sentry (error tracking)
- **Storage**: AWS S3 (images)
- **Validation**: Zod schemas
- **Serialization**: SuperJSON (for Date, Map, Set, etc.)

## Critical Notes

1. **Use tRPC for all API calls** - Never create new REST API routes. All backend operations should use tRPC routers in `server/routers/`. Client components use `trpc` hooks from `lib/trpc/client`, Server Components use helpers from `lib/trpc/server`.

2. **All table IDs must be text type** - better-auth generates string IDs, not UUIDs. Do not change ID types back to uuid.

3. **Whitelist-based authentication** - Only emails in `ADMIN_EMAILS` can login. Non-whitelisted users are blocked at OAuth callback via better-auth `after` hook in `lib/auth.ts`. Their session and user records are immediately deleted if they attempt to login.

4. **No role field in users table** - Access control is purely whitelist-based. All authenticated users are admins by definition (since only whitelisted emails can login).

5. **adminProcedure is an alias** - In `lib/trpc/init.ts`, `adminProcedure` is simply an alias of `protectedProcedure` since all authenticated users are admins.

6. **Theme changes require page refresh** - After updating theme via tRPC, `router.refresh()` is called to reapply CSS variables.

7. **Blog versions are immutable** - Every update creates a new version. Never edit existing versions.

8. **tRPC context in Server Components** - When using `trpc` or `serverClient` in Server Components, they automatically use Next.js `headers()` for context. No need to pass request objects manually.

9. **Algolia search state preservation** - InstantSearch uses `future.preserveSharedStateOnUnmount: true` to preserve widget state when components unmount. This ensures consistent search experience across navigation.

10. **Analytics privacy** - All analytics tracking respects user privacy. Implement proper cookie consent before enabling tracking in production.

11. **Environment variable naming** - Some services require both `NEXT_PUBLIC_*` (client-side) and non-prefixed (server-side) versions of the same variable (e.g., Algolia). Always check `.env.example` for the complete list.
