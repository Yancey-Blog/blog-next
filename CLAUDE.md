# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Next.js 16 blog CMS with admin dashboard, OAuth authentication, dynamic theming, full-text search, analytics tracking, and version control for blog posts. Built with App Router, Server Components, and PostgreSQL (Supabase).

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
npm run lint             # oxlint
npm run format           # oxfmt
npm run test             # Vitest unit tests
npm run test:watch       # Vitest watch mode

# Build
npm run build            # Production build
npm start                # Start production server
```

## Architecture

### Authentication System (better-auth)

- Google/GitHub OAuth and Passkey use the existing Better Auth tables and configuration.
- `lib/auth/access.ts` is the single, live `ADMIN_EMAILS` policy: normalized exact email match and verified email.
- `lib/auth/provisioning.ts` rejects unauthorized identities before user persistence and session issuance. The
  `user.validateUserInfo` gate checks fresh OAuth identity data for create, link and returning sign-in. The session
  database hook also covers Passkey and historical users, independently of request route names.
- `lib/auth/session.ts` filters every server session against the current policy. `requireAuth()` protects CMS
  layouts and the blog AI API. `lib/trpc/init.ts` and `proxy.ts` check the same policy again at their own boundaries.
- Do not use a `/sign-in/social` after-hook as the OAuth allowlist: normal OAuth login finishes at `/callback/:id`.
- Do not delete users automatically on a rejected login: user deletion cascades into authored content. Historical
  non-admin rows may be retained for investigation; a stored user/session is never sufficient authorization.

### Theme mode lifetime

- Mount `ThemeModeProvider` only in `app/layout.tsx`, shared by auth, frontend and CMS routes.
- Keep route layouts free of additional mode providers: mounting `next-themes` during client navigation creates
  another inline bootstrap script and React reports that client-rendered scripts cannot execute.
- CMS palette variables still come from `components/theme-provider.tsx`; this is separate from light/dark mode.

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
│   ├── blog-management/ # Blog CRUD; settings/ owns Hero Image, Open Source, AI Model and Push Notifications
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

Runtime database connections live in `lib/db/index.ts`. On Vercel, Supabase shared-pooler Session URLs
(port 5432) use the corresponding Transaction endpoint (6543), preserving credentials and SSL settings.
Postgres.js disables prepared statements and query pipelining, reuses one client per runtime, and retires
idle connections after five seconds. Keep the original configured URL for migrations and local persistent tools.

- `blogs` - Main blog content with slug, title, content, published status
- `blogVersions` - Version history for every blog update (title, content, publishedAt snapshots)

**Content storage (BlockNote)**: `blogs.contentBlocks` (and `blogVersions.contentBlocks`) holds the BlockNote block JSON — the editing **source of truth**. On save, the server derives `content` (clean semantic HTML via `@blocknote/server-util`) and `highlightedContent` (Shiki-highlighted HTML) from the blocks. The public render/TOC/Algolia/version-diff pipeline consumes the derived HTML, so it is unchanged. See `lib/blocknote/` (shared `schema.ts`, server `server.ts`) and `scripts/migrate-to-blocknote.ts`.

**Config Tables**:

- `settings` - Key-value JSON storage (id, key, value, description)

### tRPC API Layer

All API calls use tRPC for end-to-end type safety. Architecture:

**Server-side routers** (`server/routers/`):

- `blog.ts` - Blog CRUD operations
  - `blog.list` (publicProcedure) - Get published blogs only (for frontend)
  - `blog.listAdmin` (protectedProcedure) - Get all blogs including drafts (for admin)
  - `blog.byId` (publicProcedure) - Get single blog by ID
  - `blog.create` (protectedProcedure) - Create new blog
  - `blog.update` (protectedProcedure) - Update existing blog
  - `blog.delete` (protectedProcedure) - Delete blog
- `version.ts` - Version history (list, get, diff, restore)
- `upload.ts` - S3 presigned URL generation
- `admin.ts` - Admin operations (users, sessions, theme)
- `_app.ts` - Root router combining all routers

**tRPC Setup**:

- `server/trpc.ts` - Two procedure types (public, protected)
- `server/context.ts` - Request context with session and user
- `app/api/trpc/[trpc]/route.ts` - Next.js API handler

**Client-side hooks** (`lib/trpc/`):

- `client.tsx` - tRPC React hooks and provider (use in Client Components)
- `server.tsx` - Server-side helpers for RSC (prefetch, hydration, direct calls)
- `query-client.ts` - Shared QueryClient factory with dehydration config
- `query-client-server.ts` - Server-side cached QueryClient

**Usage patterns**:

```typescript
// Frontend - Get published blogs only
'use client'
import { trpc } from '@/_trpc/client'
const { data } = trpc.blog.list.useQuery({ page: 1 })

// Admin - Get all blogs including drafts
'use client'
import { trpc } from '@/_trpc/client'
const { data } = trpc.blog.listAdmin.useQuery({
  page: 1,
  published: true // or false for drafts, or undefined for all
})

// Server Components (fetchQuery + HydrationBoundary)
import { getQueryClient, trpc } from '@/_trpc/server'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'

const queryClient = getQueryClient()
const blogsData = await queryClient.fetchQuery(
  trpc.blog.list.queryOptions({ page: 1 })
)

return (
  <HydrationBoundary state={dehydrate(queryClient)}>
    <MyComponent blogs={blogsData.data} />
  </HydrationBoundary>
)
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

- tRPC endpoints: `trpc.upload.getPresignedUrl`, then `trpc.upload.processImage` for JPEG/PNG
- Client code never calls these directly: use `useUploadFile()` from `lib/hooks/use-upload-file.ts`
- Direct browser upload to S3 with presigned URLs; public origin is `https://static.yancey.app` (CloudFront)

### Image Pipeline (AVIF/WebP + blur-up)

Stored URLs always point at the untouched original. Everything else is derived from that URL by convention, with no lookup at render time. The rules live in one pure module, `lib/images/derivatives.ts`, shared by the generator and the render side.

- **Upload**: JPEG/PNG land in `tmp/{uuid}.{ext}`. `processImage` (sharp, `lib/images/process.ts`) writes the derivatives, then moves the original to `{uuid}_{width}x{height}.{ext}`. The dimensions in the file name are how the render side knows the size.
- **Derivatives**: `_derived/{original key}/w{N}.avif|webp` for widths `[480, 960, 1440, 2400]` (exact tiers when the width is known, all four otherwise) plus `_derived/{original key}/lqip.webp` (24px, written last as the "done" marker).
- **Eligible**: `jpg`/`jpeg`/`png` on `static.yancey.app`. GIF, SVG, WebP originals and videos are served as-is.
- **Render**: `components/picture.tsx` (`<picture>` with AVIF/WebP), `components/lazy-load-image.tsx` (blur-up, always fills its parent; pass `sizes`), and `lib/images/transform-html.ts` + `components/blog-content-images.tsx` for post bodies (render-time only; stored HTML keeps plain `<img>`).
- **Legacy images** (no dimensions in the name) were backfilled with `pnpm images:backfill`. It is idempotent; re-run it after importing images by any other route.
- Never hand-build an `<img>` for a first-party image on a public page: use `Picture` or `LazyLoadImage`.

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
- `.gitignore` - Excludes generated service worker files (sw.js, workbox-_.js, worker-_.js)

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
      // Current verified-email whitelist is checked on each protected request
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
DATABASE_URL=                                # Supabase PostgreSQL connection string

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

# AWS S3 (Image uploads)
AWS_REGION=                                  # S3 region (e.g., us-east-1)
AWS_ACCESS_KEY_ID=                           # S3 credentials
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET_NAME=                          # S3 bucket name

# Search (Algolia)
NEXT_PUBLIC_ALGOLIA_SEARCH_APP_ID=           # Algolia application ID
NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=          # Search-only API key (public)
NEXT_PUBLIC_ALGOLIA_SEARCH_INDEX_NAME=       # Index name
ALGOLIA_ADMIN_API_KEY=                       # Admin API key (server-side indexing)

# Analytic
NEXT_PUBLIC_GA_KEY=                          # Google Analytics 4 measurement ID (G-XXXXXXXXXX)

# Monitoring
NEXT_PUBLIC_SENTRY_DSN=                      # Sentry error tracking DSN
```

See `.env.example` for detailed documentation on each variable.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Server Components, React 19)
- **API**: tRPC 11 with React Server Components support
- **Data Fetching**: TanStack Query (React Query) via @trpc/tanstack-react-query
- **Database**: PostgreSQL (Supabase) + Drizzle ORM
- **Cache**: Redis (optional, for caching)
- **Auth**: better-auth with OAuth (Google, GitHub)
- **UI**: shadcn/ui-style components (hand-maintained) on Base UI (`@base-ui/react`) + Tailwind CSS
- **Editor**: BlockNote.js (block-based; blocks JSON is the editing source of truth, with derived HTML for rendering/search/diff)
- **Search**: Algolia InstantSearch (full-text search)
- **Analytics**: Google Analytics 4 / Google Tag Manager via @next/third-parties
- **Monitoring**: Sentry (error tracking)
- **Storage**: AWS S3 (images)
- **Validation**: Zod schemas
- **Serialization**: SuperJSON (for Date, Map, Set, etc.)

## Critical Notes

1. **Use tRPC for all API calls** - Never create new REST API routes. All backend operations should use tRPC routers in `server/routers/`. Client components use `trpc` hooks from `lib/trpc/client`, Server Components use helpers from `lib/trpc/server`.

2. **All table IDs must be text type** - better-auth generates string IDs, not UUIDs. Do not change ID types back to uuid.

3. **Whitelist-based authentication** - Only verified emails in `ADMIN_EMAILS` may provision users, establish sessions or access protected resources. Policy is checked before writes and on every protected server request; historical user rows are retained.

4. **No role field in users table** - Access control is purely whitelist-based. All authenticated users are admins by definition (since only whitelisted emails can login).

5. **Theme changes require page refresh** - After updating theme via tRPC, `router.refresh()` is called to reapply CSS variables.

6. **Blog versions are immutable** - Every update creates a new version. Never edit existing versions.

7. **tRPC context in Server Components** - When using `trpc` or `serverClient` in Server Components, they automatically use Next.js `headers()` for context. No need to pass request objects manually.

8. **Algolia search state preservation** - InstantSearch uses `future.preserveSharedStateOnUnmount: true` to preserve widget state when components unmount. This ensures consistent search experience across navigation.

9. **Analytics privacy** - All analytics tracking respects user privacy. Implement proper cookie consent before enabling tracking in production.

10. **Environment variable naming** - Some services require both `NEXT_PUBLIC_*` (client-side) and non-prefixed (server-side) versions of the same variable (e.g., Algolia). Always check `.env.example` for the complete list.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

### Hikki management

`app/(cms)/admin/hikki-management/page.tsx` and `components/hikki-manager.tsx` add Hikki to the existing CMS.
All operations use the `hikki` protected tRPC router in `lib/trpc/routers/hikki.ts` and the current verified-email
admin whitelist. No separate login, auth tables or provider is introduced. `lib/hikki/` holds server-only CloudKit
transport/review services; configure HIKKI_CLOUDKIT_* in this project's Vercel environment. The public Hikki site
continues to handle SSR and native submissions; its /admin route redirects here. Review requests and notification device changes are audited in CloudKit. All community review is manual;
there is no AI review provider, settings endpoint, or risk-hint UI. Approvals queue author notifications by CloudKit's authoritative record creator;
native DeviceRegistration records prove the CloudKit creator without another App login. The protected CMS
pairDevice/updateDevice procedures bind and revoke CommunityReviewerDevice records using fresh, one-time codes.
Native registration and scoped-capability notification delivery run on the Hikki website (APNs keys stay there).
lib/hikki/notifications.ts queues/dispatches approvals and retries a bounded outbox batch; nextAttemptAt provides
backoff. Failed alerts remain queued. Real CloudKit/APNs and visual acceptance require deployment and the additive
Configs/CloudKit/community-cms.ckdb from the Hikki repository.

Hikki document updates retain the last approved snapshot and public URL while the new private snapshot is reviewed.
ReviewSubmission.replaces links to the prior approved snapshot, but is never trusted alone: approval validates both
CloudKit record creators and the current PublishedPage.reviewRecordName. CAS commits the approved snapshot to the
stable public record; listing metadata/final status can be repaired by retrying a publishing item. A pending or rejected
revision cannot withdraw the active version. Rejection includes a durable author reason and notification. Reviewer
pairing keys are derived from the CloudKit account, so all enabled devices on that account receive alerts; legacy
per-device binding keys are ignored. The current ADMIN_EMAILS identify the owner's three CMS identities.

The latest 50 CMS auth/update/notification/error-diagnostic tests and 26 Hikki website tests passed in offline Linux containers
with empty credentials, read-only source/toolchain and bounded resources. CMS TypeScript and targeted lint passed.
Tests reproduce the legacy OAuth callback hook gap using fake providers and an in-memory adapter, and verify
foreign historical sessions receive HTTP 401 from the blog AI route. The full Next/Turbopack production build
also passed offline using cached fonts on container loopback and fixture-only configuration/root/worker limits.
The earlier security review used offline fixtures and did not test production identities. The owner subsequently
authorized production Community device testing. Redacted-query diagnostics deployment dpl_4pMvRh6w61Sofg5Miz72WBjwxF9U is Ready on production.
Actual reviewer-list requests return 403 ACCESS_DENIED (server-key owner role membership pending), while the queue
returns 400 BAD_REQUEST (upstream reason: createdBy is not queryable). The Hikki schema/desktop copy now
adds Users.___recordID QUERYABLE and ReviewSubmission.___createdBy QUERYABLE; Console Users now returns 3 records.
The device iCloud identity differs from the S2S creator. Do not guess IDs or grant all Users moderator rights.
The error panel now offers Identify server account: protected hikki.serverIdentity reads GET users/caller
with the configured server key, returning only container/environment/userRecordName. It does not enumerate other
users or disclose profile data/credentials. GET signs an empty body; regression tests verify the signature
and reject ambiguous/malformed identities. Existing permission tests also cover this protected endpoint.
The initial live identity lookup failed without detailed logs. Network failures and unavailable caller shapes now
log only fixed codes/structure booleans/counts; users/current provides a signed same-key compatibility fallback.
Authentication/permission failures and ambiguous/invalid identities do not switch identity sources.
Queue queries no longer show the index error, but empty results do not prove moderator access; device listing
still returns ACCESS_DENIED and the owner subsequently identified the live server principal as _3f8ced5102ee91d1e2f0a343f15ab912. The owner assigned HikkiModerator to that exact Users record and verified at 2026-11-06 00:07 that reviewer/queue lists load without the permission error. The owner subsequently confirmed that the Yancey reviewer account is paired and enabled. Moderation writes and real Mac/iPhone APNs delivery remain unverified. The Paired by email identifies the CMS operator, not the linked iCloud account. Do not assume both are permissions errors.
CloudKit transport logs fixed operation/status/code; 400 records/query hints redact URLs/opaque values and are bounded.
Protected CMS errors distinguish server authentication, role access, schema/query feedback and version conflicts.
No foreign account/AI probes, database cleanup or Git pushes were performed. Local .env files are excluded by
.vercelignore, and deployment inputs were checked before upload.

CMS decisions and attachment reads now require the revision returned with the reviewed detail. Confirmations
capture that article and revision; conflicts invalidate stale detail before another decision. Public snapshots
persist PublishedPage.reviewRevision, and asset re-referencing verifies the claimed source revision before
publication. Recovery cannot substitute a changed source. Unpublishing checks a composite Listing/public-page
revision and CAS-deletes content before discovery, retaining author withdrawal state across interrupted cleanup.
Import the updated Hikki community-cms.ckdb before deploying this CMS revision.

2026-11-06 live test: the author submitted and iPhone received the review alert, but Approve failed in
records/modify with 400 BAD_REQUEST / Unexpected input. The exact write stage is unresolved. Failed writes
now log bounded operation/record types and field name/type/kind only (no record IDs, values or asset receipts).
The protected error prefix says request rather than query. Test submission recovery still needs live validation.

Live retry at 2026-11-06 03:39 isolated the failing write to PublishedPage/create. Publication now normalizes
Apple writable asset receipts (requires checksum/receipt/size; excludes read-only metadata), omits absent
optional lists on first create, and explicitly clears old metadata on update. CAS/review lineage remains.
Write diagnostics use JSON strings so nested fields survive log formatting. 50 CMS tests/typecheck/lint pass;
root-cause closure and successful publication still require the owner to retry Finish publication after deploy.

Owner-confirmed: the original test page is published and visible in Community, and the iPhone received its
approval push. The UI now uses Approve and publish / Approve update consistently; the Finish publication
label was removed at the owner's request. Backend publishing/CAS recovery is retained. Other flow acceptance
(update/reject/unpublish/Mac delivery) is still pending.

2026-11-06 reviewer enrollment is now CMS initiated: create a ten-minute hikki://reviewer-pair# invitation in CMS,
explicitly confirm on iOS, then complete in the original CMS tab. No pairing code/action appears in public App settings.
iOS community notifications use an explicit switch. macOS community notification registration/settings were removed;
keep its separate CKSyncEngine silent-push registration and local reminders. Versioned device-registration-ios-UUID
records let the server exclude all legacy/unknown-platform tokens (including old Macs) without schema migration.
Existing iOS users must install/open build 8 to re-register; their account-level reviewer binding persists.
CMS 52 + website 34 regressions and 4 native link tests (10 parameterized executions) passed. Native Release build 8
archives and both signatures/ten symbol pairs passed; TestFlight upload/real-device acceptance tracked in issue-366 docs.

2026-11-06 ISSUE-372: CMS notifications and Published use existing Table primitives; manual refresh/retry buttons
were removed and bounded queue recovery runs once on CMS load. Reviewer rows expose account ID/operator/time/iOS
counts only, never APNs tokens or enrollment proofs. Pending snapshots use protected, revision-checked preview
asset manifests in a cross-origin Hikki website frame; it reuses the real SharedPage/HTML sanitizer/styles and
accepts only known CMS origins. No private document is loaded by URL or anonymously queried by the preview shell.
Public community URLs are now UUID-only. The owner explicitly requested no legacy-link compatibility: old
page-review- URLs return 404, all current list/CMS/native-copy/approved-push links use the new public UUID.
Storage record IDs and references remain stable; update approvals send the actual public page ID so the phone
opens the same approved page. Native build 9 uploaded to both TestFlight platforms; Apple processing. CMS 60 +
website 40 regressions and 20 native publishing tests passed. New pending-preview/device acceptance remains human.

2026-11-06 follow-up: owner prefers manual inspection/removal of sharing activity rather than a standalone report UI
or expanded account bans. Report this page was removed; public Contact and actual email/manual handling policy remain.
CMS now lists active encrypted PublishedPage records (listed=0), metadata only; no key/title/content/asset URL leaves
the protected boundary. removeLinkShare verifies listed=0 plus current etag before deletion, with a requested audit.
It removes the hosted copy, not workspace data, saved reader copies or the ability to share again. No schema change.
CMS READY dpl_EftyCwVJWmogYy6zJGnbSKDzM3xH; website READY dpl_JDoogJ7fYWTAGvKqom6wTYhRVUkK. 64 CMS tests,
whole CMS types and changed-file lint pass. Chrome showed both existing encrypted shares and remove buttons; no real
delete was performed. Full sharing-event history/push and CMS-readable encrypted-page content are NOT implemented.
ISSUE-282 remains In Progress pending the owner's choice: retain link-only end-to-end encryption with metadata/removal
only, or explicitly disclose administrator inspection and provide readable content. Do not silently upload keys or
content, or claim existing encrypted pages are readable. Build 10 retains existing encryption; both TestFlight uploads
succeeded. Native App remains untouched in this follow-up.

2026-11-06 reader reporting supersedes the earlier proactive-sharing-inspection plan: link-only pages retain
end-to-end encryption. Hikki website /api/reports accepts a reason and bounded explanation, never page contents,
keys, complete URLs or anonymous read access. SharedPageReport records are HikkiModerator-only; import and deploy
the new type in Hikki Configs/CloudKit/community-cms.ckdb before enabling production. The protected reports queue
replaces the active encrypted-share inventory in HikkiManager. Plain reader allegations are rendered as text.
Report actions dismiss, remove a confirmed current hosted revision, or close an already absent page honestly.
Removal claims the report before deletion; failed operations remain under Removal in progress for deliberate
recovery, never silently deleting a later page revision. Existing Community submission review stays in place.
No report-triggered APNs notification is implemented.

2026-11-13 publication recovery: the owner's N4 submission had seven ASSET_LIST attachments. Apple's
assets/rereference returned a per-field error for files while the scalar payloadFile receipt succeeded.
Publication now re-references only the scalar payload and copies each attachment through assets/upload,
retaining order and validating checksum/size. Downloads/uploads accept only trusted Apple HTTPS hosts,
reject redirects, and use bounded streams, timeouts and a 20 MiB aggregate limit. Source revision is checked
again before any public write; publishing retries and the stable page URL remain intact. Errors identify a
fixed publication stage without exposing contents, signed URLs or receipts. Failed decisions close the
confirmation overlay, invalidate stale data and show the error toast. Production retry of the original N4
returned 200 / ok / notificationQueued, left Pending review and appeared in Published; its public page returns 200. 227 CMS tests, TypeScript and changed-file lint pass. No user article or sharing record was deleted.
