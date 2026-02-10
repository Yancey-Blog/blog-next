# Blog Next

A modern, full-featured blog CMS built with Next.js 16, featuring an admin dashboard, OAuth authentication, dynamic theming, full-text search, analytics, and PWA support.

## ✨ Features

### 🎨 Frontend
- **Modern Design**: Card-based responsive layout with smooth animations
- **Hero Section**: Full-viewport hero with glitch text effect
- **PWA Support**: Install as standalone app on mobile/desktop
- **Dark Mode**: System-aware theme with light/dark/system modes
- **SEO Optimized**: Open Graph, Twitter Cards, sitemap, robots.txt
- **Lazy Loading**: Optimized image loading for better performance
- **Full-text Search**: Algolia-powered instant search with highlights

### 🛠️ Admin Dashboard
- **Blog Management**: Create, edit, publish/unpublish, delete posts
- **Rich Editor**: TinyMCE WYSIWYG editor with image upload
- **Version Control**: Automatic version snapshots on every update
- **User Management**: View and manage authenticated users
- **Session Monitoring**: Track active sessions with IP/user agent
- **Theme Customization**: 5 preset themes with real-time preview

### 🔐 Authentication & Security
- **OAuth Only**: Google and GitHub authentication
- **Whitelist-based**: Only authorized emails can access admin
- **Session Management**: PostgreSQL-backed secure sessions
- **Error Monitoring**: Sentry integration for error tracking

### 📊 Analytics & Monitoring
- **Google Analytics**: GA4 or GTM integration via `@next/third-parties`
- **Event Tracking**: Page views, searches, blog views, interactions
- **Error Tracking**: Full-stack Sentry monitoring (client/edge/server)
- **Performance**: Automatic performance tracing

### 🎨 Theming System
- **5 Preset Themes**: Default, Neo Brutalism, Vibrant Purple, Ocean Breeze, Sunset Glow
- **Dynamic Colors**: OKLCH color space for perceptually uniform colors
- **CSS Variables**: Theme colors injected as CSS custom properties
- **Real-time Preview**: Instant theme switching without reload

## 🚀 Tech Stack

| Category | Technologies |
|----------|-------------|
| **Framework** | Next.js 16 (App Router, React 19, Server Components) |
| **API** | tRPC 11 with RSC support |
| **Database** | PostgreSQL (Neon) + Drizzle ORM |
| **Auth** | better-auth (OAuth: Google, GitHub) |
| **UI** | shadcn/ui, Radix UI, Tailwind CSS |
| **Editor** | TinyMCE (WYSIWYG) |
| **Search** | Algolia InstantSearch |
| **Analytics** | Google Analytics 4 / Tag Manager |
| **Monitoring** | Sentry (error tracking) |
| **Storage** | AWS S3 (image uploads) |
| **Cache** | Redis (optional) |
| **Validation** | Zod schemas |

## 📦 Prerequisites

- Node.js 18+ or Bun
- PostgreSQL database (recommend [Neon](https://neon.tech))
- AWS S3 bucket (for image uploads)
- Algolia account (for search)
- OAuth apps (Google and/or GitHub)

## ⚙️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd blog-next
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   # or
   bun install
   ```

3. **Set up environment variables**

   Copy `.env.example` to `.env.local` and fill in the values:

   ```bash
   cp .env.example .env.local
   ```

   Required variables:
   - `DATABASE_URL` - PostgreSQL connection string
   - `BETTER_AUTH_SECRET` - Random secret (generate with `openssl rand -base64 32`)
   - `ADMIN_EMAILS` - Comma-separated list of authorized admin emails
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - OAuth credentials
   - `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` - OAuth credentials
   - `AWS_*` - S3 credentials for image uploads
   - `NEXT_PUBLIC_ALGOLIA_*` - Algolia search credentials
   - `NEXT_PUBLIC_GA_KEY` or `NEXT_PUBLIC_GTM_ID` - Analytics
   - `NEXT_PUBLIC_SENTRY_DSN` - Error monitoring (optional)

4. **Set up the database**

   Push schema to database:
   ```bash
   npm run db:push
   ```

   Or generate and run migrations:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to see the frontend.
   Admin dashboard is at [http://localhost:3000/admin](http://localhost:3000/admin).

## 🎯 Development Commands

```bash
# Development
npm run dev              # Start dev server (localhost:3000)

# Database (Drizzle ORM)
npm run db:generate      # Generate migrations from schema
npm run db:push          # Push schema to database (dev)
npm run db:migrate       # Run migrations (production)
npm run db:studio        # Open Drizzle Studio GUI

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format with Prettier

# Build & Deploy
npm run build            # Production build
npm start                # Start production server
```

## 📁 Project Structure

```
blog-next/
├── app/
│   ├── (auth)/              # Authentication pages (login, register)
│   ├── (cms)/admin/         # Admin dashboard (protected routes)
│   │   ├── blog-management/ # Blog CRUD
│   │   ├── users/           # User management
│   │   ├── sessions/        # Session monitoring
│   │   └── settings/        # Theme settings
│   ├── (frontend)/          # Public frontend
│   │   ├── page.tsx         # Homepage with hero & latest posts
│   │   ├── post/            # Blog listing & detail pages
│   │   └── layout.tsx       # Frontend layout (SEO, Analytics)
│   ├── api/
│   │   ├── auth/[...all]/   # better-auth API handlers
│   │   └── trpc/[trpc]/     # tRPC API endpoint
│   ├── globals.css          # Global styles + animations
│   └── google-analytics.tsx # GA4/GTM integration
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── algolia-search.tsx   # Search drawer
│   ├── frontend-header.tsx  # Public header
│   ├── frontend-footer.tsx  # Footer with theme switcher
│   ├── lazy-load-image.tsx  # Optimized image component
│   ├── theme-provider.tsx   # Dynamic theme injection
│   └── theme-settings.tsx   # Theme selector UI
├── lib/
│   ├── auth.ts              # better-auth config
│   ├── auth-utils.ts        # Admin email helpers
│   ├── db/
│   │   ├── index.ts         # Drizzle client
│   │   └── schema.ts        # Database schema
│   ├── services/            # Service layer (blog, version, settings)
│   ├── themes/              # Theme definitions
│   ├── trpc/                # tRPC client/server setup
│   ├── analytics.ts         # Analytics tracking utilities
│   └── algolia.ts           # Algolia search utilities
├── server/
│   ├── routers/             # tRPC routers (blog, admin, upload)
│   ├── context.ts           # Request context
│   └── trpc.ts              # tRPC procedures
├── public/
│   ├── manifest.json        # PWA manifest
│   ├── icon-*.png           # PWA icons (72-512px)
│   ├── robots.txt           # SEO crawler rules
│   └── sitemap-index.xml    # XML sitemap
├── sentry.*.config.ts       # Sentry configurations
├── CLAUDE.md                # AI assistant instructions
└── README.md                # This file
```

## 🔐 Authentication Flow

1. User clicks "Sign in with Google" or "Sign in with GitHub"
2. OAuth provider handles authentication
3. better-auth `after` hook checks if email is in `ADMIN_EMAILS`
4. ✅ **Whitelisted**: Session created, user redirected to admin dashboard
5. ❌ **Not whitelisted**: Session/user deleted, redirected to `/unauthorized`

## 🎨 Theme System

Themes are stored in the database (`settings` table) and applied via CSS variables:

1. Admin selects theme from `/admin/settings`
2. Theme saved to database via tRPC
3. `ThemeProvider` component reads theme from database
4. CSS variables injected into `:root`
5. Components use CSS variables for colors

**Available themes**:
- Default
- Neo Brutalism
- Vibrant Purple
- Ocean Breeze
- Sunset Glow

## 🔍 Search Integration

Algolia powers the full-text search:

1. User types in search box (header)
2. Algolia InstantSearch queries index in real-time
3. Results displayed in slide-out drawer
4. Highlights matching text in title/content
5. Click result to navigate to post

**Indexing**: Use Algolia dashboard or API to index blog posts.

## 📊 Analytics Events

Track custom events using the `analytics` utility:

```typescript
import { analytics } from '@/lib/analytics'

// Track page views
analytics.trackPageView('/blog/post-slug')

// Track blog interactions
analytics.trackBlogView('post-id', 'Post Title')

// Track searches
analytics.trackSearch('search query', 42)

// Track button clicks
analytics.trackButtonClick('button-name', 'location')

// Track theme changes
analytics.trackThemeChange('dark')
```

## 🐛 Error Monitoring

Sentry automatically captures:
- Unhandled exceptions
- Promise rejections
- API errors
- Performance issues

Configure in `sentry.*.config.ts` files.

## 📱 PWA Installation

Users can install the blog as a native app:

1. Visit site on mobile device
2. Browser shows "Add to Home Screen" prompt
3. Icon appears on home screen
4. Opens in standalone mode (no browser UI)

## 🚢 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Other Platforms

1. Build the project: `npm run build`
2. Start server: `npm start`
3. Set environment variables
4. Ensure PostgreSQL and Redis are accessible

## 📝 Environment Variables

See `.env.example` for complete list with descriptions.

**Critical variables**:
- `DATABASE_URL` - PostgreSQL connection
- `BETTER_AUTH_SECRET` - Auth secret
- `ADMIN_EMAILS` - Admin whitelist
- `NEXT_PUBLIC_APP_URL` - App URL
- OAuth credentials (Google/GitHub)
- AWS S3 credentials
- Algolia credentials
- Analytics ID (GA4 or GTM)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org) - React framework
- [better-auth](https://better-auth.com) - Authentication
- [tRPC](https://trpc.io) - End-to-end type safety
- [Drizzle ORM](https://orm.drizzle.team) - TypeScript ORM
- [shadcn/ui](https://ui.shadcn.com) - UI components
- [Algolia](https://algolia.com) - Search platform
- [Sentry](https://sentry.io) - Error monitoring

## 📧 Support

For issues and questions, please open an issue on GitHub.

---

**Built with ❤️ using Next.js 16 and modern web technologies**
