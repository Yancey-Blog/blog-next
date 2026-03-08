# Yancey Blog

A modern, full-featured personal blog CMS built with Next.js 16. Features a public frontend with parallax hero, full-text search, and animated article cards, plus a protected admin dashboard with rich post editing, real-time analytics charts, and dynamic theming.

## Features

### Frontend

- **Parallax hero** — full-viewport background with scroll effect, framer-motion animations, CountUp stats
- **Article cards** — featured post + responsive grid, equal-height flex layout
- **Post detail** — syntax-highlighted code blocks, auto-generated TOC, optimistic like button, Twitter share, PV auto-increment
- **Algolia search** — ⌘K modal with instant results, snippet highlights, always-visible PoweredBy
- **Dark mode** — light / dark / system toggle in footer
- **PWA** — installable as standalone app with multi-size icons
- **SEO** — Open Graph, Twitter Cards, sitemap, robots.txt

### Admin Dashboard

- **Blog management** — create, edit, publish/unpublish, delete with TinyMCE WYSIWYG editor
- **Version control** — automatic snapshots on every save, diff viewer, restore
- **Real-time analytics** — posts per month, published/draft ratio, top posts by views & likes, tag distribution
- **Settings** — homepage hero image upload (S3) or URL paste, 5 preset themes
- **User management** — view users, revoke sessions
- **Error monitoring** — Sentry integration (client / edge / server)

### Auth & Security

- **OAuth only** — Google and GitHub (no password)
- **Whitelist-based** — only `ADMIN_EMAILS` can log in; others are rejected at callback
- **Session storage** — PostgreSQL via better-auth + Drizzle adapter

## Tech Stack

| Category       | Technology                                           |
| -------------- | ---------------------------------------------------- |
| **Framework**  | Next.js 16 (App Router, React 19, Server Components) |
| **API**        | tRPC 11 with RSC support + SuperJSON                 |
| **Database**   | PostgreSQL (Neon) + Drizzle ORM                      |
| **Auth**       | better-auth (OAuth: Google, GitHub)                  |
| **UI**         | shadcn/ui + Radix UI + Tailwind CSS v4               |
| **Animation**  | Framer Motion + react-countup                        |
| **Editor**     | TinyMCE (WYSIWYG)                                    |
| **Search**     | Algolia InstantSearch                                |
| **Analytics**  | Google Analytics 4 / Tag Manager                     |
| **Charts**     | Recharts                                             |
| **Monitoring** | Sentry                                               |
| **Storage**    | AWS S3 (image uploads, CDN via static.yancey.app)    |
| **Linting**    | ESLint + Prettier                                    |
| **Validation** | Zod                                                  |

## Prerequisites

- Node.js 20+ (or pnpm / bun)
- PostgreSQL database — [Neon](https://neon.tech) recommended
- AWS S3 bucket for image uploads
- Algolia account for search
- OAuth apps — Google and/or GitHub

## Installation

```bash
# 1. Clone
git clone <repository-url>
cd blog-next

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp .env.example .env.local
# Fill in all required variables (see below)

# 4. Push database schema
pnpm db:push

# 5. Start dev server
pnpm dev
```

Frontend: http://localhost:3000
Admin: http://localhost:3000/admin

## Development Commands

```bash
# Dev server
pnpm dev

# Database
pnpm db:push          # Push schema to DB (dev)
pnpm db:generate      # Generate migration files
pnpm db:migrate       # Run migrations (production)
pnpm db:studio        # Open Drizzle Studio GUI

# Code quality
pnpm lint             # ESLint
pnpm format           # Prettier

# Build
pnpm build
pnpm start
```

## Project Structure

```
blog-next/
├── app/
│   ├── (auth)/              # Login, register, unauthorized
│   ├── (cms)/admin/         # Protected admin dashboard
│   │   ├── page.tsx         # Dashboard with charts
│   │   ├── blog-management/ # Blog CRUD
│   │   ├── users/           # User management
│   │   ├── sessions/        # Session monitoring
│   │   └── settings/        # Hero image + theme settings
│   ├── (frontend)/          # Public blog
│   │   ├── page.tsx         # Homepage (hero + articles)
│   │   ├── post/            # Listing + detail
│   │   └── legal/           # Privacy policy, terms of use
│   └── api/
│       ├── auth/[...all]/   # better-auth handlers
│       └── trpc/[trpc]/     # tRPC endpoint
├── components/
│   ├── ui/                  # shadcn/ui primitives
│   ├── home-hero.tsx        # Parallax hero with animations
│   ├── home-articles.tsx    # Featured + grid article cards
│   ├── post-actions.tsx     # Like + share (optimistic UI)
│   ├── blog-toc.tsx         # Auto-generated table of contents
│   ├── algolia-search.tsx   # ⌘K search modal
│   ├── chart-*.tsx          # Dashboard chart components
│   ├── frontend-header.tsx  # Public header
│   ├── frontend-footer.tsx  # Footer with theme switcher
│   └── theme-provider.tsx   # Dynamic CSS variable injection
├── lib/
│   ├── auth/                # better-auth config + session helpers
│   ├── db/                  # Drizzle client + schema
│   ├── services/            # BlogService, SettingsService, etc.
│   ├── trpc/                # Client + server helpers, routers
│   ├── themes/              # 5 preset theme definitions
│   ├── shiki.ts             # Code highlighting + TOC ID injection
│   └── s3.ts                # S3 presigned URL generation
├── public/
│   ├── manifest.json        # PWA manifest
│   └── icon-*.png           # App icons (72–512px)
├── eslint.config.mjs        # ESLint config (Next.js rules)
├── drizzle/                 # Migration files
└── sentry.*.config.ts       # Sentry configurations
```

## Environment Variables

Copy `.env.example` and fill in all values:

```bash
# Database
DATABASE_URL=                    # Neon PostgreSQL connection string

# App
NEXT_PUBLIC_APP_URL=             # e.g. https://yancey.app

# Auth
BETTER_AUTH_SECRET=              # openssl rand -base64 32
ADMIN_EMAILS=                    # comma-separated admin emails

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# TinyMCE editor
NEXT_PUBLIC_TINYMCE_API_KEY=

# AWS S3 (image uploads)
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET_NAME=

# Algolia search
NEXT_PUBLIC_ALGOLIA_SEARCH_APP_ID=
NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=
NEXT_PUBLIC_ALGOLIA_SEARCH_INDEX_NAME=
ALGOLIA_APPLICATION_ID=
ALGOLIA_ADMIN_API_KEY=
ALGOLIA_SEARCH_INDEX=

# Analytics (one of)
NEXT_PUBLIC_GA_KEY=              # GA4 measurement ID  (G-XXXXXXXXXX)
NEXT_PUBLIC_GTM_ID=              # GTM container ID    (GTM-XXXXXX)

# Monitoring
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=               # optional, for source maps
SENTRY_ORG=
SENTRY_PROJECT=
```

## Authentication Flow

1. User signs in via Google or GitHub
2. better-auth `after` hook checks email against `ADMIN_EMAILS`
3. ✅ Whitelisted → session created, redirected to `/admin`
4. ❌ Not whitelisted → session + user record deleted, redirected to `/unauthorized`

## Deployment

### Vercel (recommended)

1. Push to GitHub
2. Import in Vercel
3. Add all environment variables
4. Deploy — Vercel handles `next build` automatically

### Self-hosted

```bash
pnpm build
pnpm start
```

Ensure `DATABASE_URL` and all required env vars are set in the production environment.

## License

MIT
