# Meiji Cat Site — Design

- Date: 2026-05-21
- Status: Approved, building first version
- Goal: A standalone, cute + richly-animated public site for the cat **Meiji** at `https://meiji.yanceyleo.com`, built from THIS same Next.js project (no second deployment), with content managed from a new sub-menu in the existing `/admin`.

## Context

- App runs on Vercel. Main blog: `yanceyleo.com`; admin: `yanceyleo.com/admin`; dev: `localhost:3000`.
- Route groups today: `app/(frontend)` (blog), `app/(cms)/admin` (admin), `app/(auth)`.
- `proxy.ts` is the Next.js middleware (gates `/admin` by whitelist).
- Stack already includes Framer Motion (animations), AWS S3 (uploads via tRPC presigned URLs), Drizzle/Postgres (Supabase), tRPC, `settings` key-value table + `SettingsService`.

## Decisions

1. **Multi-domain, one project.** `meiji.yanceyleo.com` is added to the same Vercel project. `proxy.ts` rewrites that host's requests to an internal `app/meiji/*` path (address bar stays clean). Main domain + `/admin` unchanged. The cat host is blocked from `/admin` and blog routes.
2. **Independent frontend** under `app/meiji/` — own layout, theme, metadata/OG, single animated landing page.
3. **Shared backend.** New `meijiRouter` (tRPC) + `MeijiService`, reusing the existing DB and S3.
4. **Admin sub-menu** "Meiji" under `app/(cms)/admin/meiji-management/`, same whitelist auth.
5. **Minimal schema churn**: one new table (`meiji_media`); profile + featured tweets live in the existing `settings` table.
6. **Twitter via `react-tweet`** (Vercel) — SSR embeds from the public syndication CDN; no API keys.

## Content model

Three blocks on the landing page: **Hero/About → Media feed → Featured tweets**.

### Profile (singleton)

Stored in `settings`, key `meiji_profile` (JSON). Initial value:

<!-- name is 明治 (Meiji); "明治です！" is a spoken greeting shown in the hero, not the name. -->

```json
{
  "name": "明治",
  "gender": "Boy",
  "breed": "Blue Golden Shaded British Shorthair",
  "birthday": "2026-03-05",
  "bio": "",
  "avatarUrl": "",
  "xHandle": "meiji_20260305"
}
```

Editable from admin.

### Media feed (`meiji_media` table — new)

| Column      | Type                   | Notes                                    |
| ----------- | ---------------------- | ---------------------------------------- |
| `id`        | text (pk)              | uuid                                     |
| `type`      | text                   | `'photo' \| 'video'`                     |
| `url`       | text                   | S3 URL                                   |
| `caption`   | text (nullable)        | short caption                            |
| `milestone` | text (nullable)        | optional tag, e.g. `birthday`, `vaccine` |
| `takenAt`   | timestamp              | display/sort date                        |
| `createdAt` | timestamp (defaultNow) |                                          |

Admin CRUD; uploads reuse the existing `trpc.upload.getPresignedUrl` → S3 direct-upload flow.

### Featured tweets

Stored in `settings`, key `meiji_featured_tweets` (JSON list), e.g. `[{ "url": "https://x.com/meiji_20260305/status/123", "note": "First vaccine!" }]`. Frontend parses the status ID and renders `<Tweet id="…" />` (`react-tweet`), ordered as listed.

## Backend

- `lib/services/meiji.service.ts` — `MeijiService`: `getProfile/updateProfile` (settings), `listMedia/createMedia/updateMedia/deleteMedia` (table), `getFeaturedTweets/setFeaturedTweets` (settings).
- `lib/trpc/routers/meiji.ts` — `meijiRouter`:
  - public: `profile`, `media.list`, `featuredTweets`
  - protected: `profile.update`, `media.create|update|delete`, `featuredTweets.set`
- Register in `_app.ts`.
- `lib/validations/meiji.ts` — Zod schemas.

## Routing (`proxy.ts`)

At the top of `proxy()`, before the `/admin` logic:

```
host = request.headers.get('host')
if host is the meiji host (meiji.yanceyleo.com or meiji.localhost:*):
  if pathname starts with /admin or /post or /api: (api still shared) → only block /admin, /post page routes
  rewrite pathname → `/meiji` + pathname  (so app/meiji/* serves it)
```

- API routes (`/api/trpc`) are shared and must NOT be rewritten (the meiji frontend calls the same tRPC endpoint, same origin per host).
- The middleware matcher already excludes `api`, `_next`, static; keep it.
- Local dev: browsers resolve `*.localhost` to 127.0.0.1, so `http://meiji.localhost:3000` exercises the meiji host; `localhost:3000` stays the blog.

## Frontend (`app/meiji/`)

- `app/meiji/layout.tsx` — own `<html>`-level metadata/OG, fonts, cute theme tokens (pastel lavender/mint/peach, rounded, bold display type). Does NOT inherit the blog chrome.
- `app/meiji/page.tsx` — single landing page composing client section components.
- Sections (client components, Framer Motion):
  - **Hero/About** — big rounded wordmark, mascot/avatar, the profile line, X link, scroll cue, entrance + parallax/float animations.
  - **Media feed** — animated masonry/grid of photos & videos with captions/milestone badges; hover/scroll-reveal motion; lightbox optional (YAGNI for v1 — start with grid + inline video).
  - **Featured tweets** — `react-tweet` cards in a responsive row, styled to match.
- Design language: cute, pastel, rounded, playful, motion-rich (reference: the "Pawvera" mock). Use the **frontend-design** skill for this layer.

## Admin (`app/(cms)/admin/meiji-management/`)

- Page with three areas: Profile form, Media manager (upload + list + edit/delete), Featured-tweets manager (add URL + note, reorder, remove).
- Add a "Meiji" item to the admin sidebar (`components/app-sidebar.tsx` / `nav-main.tsx`).
- Reuse existing UI primitives (shadcn) + the `BlogImageUpload`/S3 pattern.

## Vercel / DNS

- Add `meiji.yanceyleo.com` to the project's Domains.
- DNS: `CNAME meiji → cname.vercel-dns.com` (user action).
- No second deployment, no extra cost.

## Testing

- Unit: `MeijiService` validation schemas; tweet-URL→ID parsing.
- Manual: `meiji.localhost:3000` renders the landing page; admin CRUD updates it; blog + `/admin` on `localhost:3000` unaffected; cat host blocked from `/admin`.

## Out of scope (YAGNI v1)

- Comments/likes on the cat site.
- Twitter API timeline sync (manual featured URLs only).
- Lightbox/gallery viewer (start with grid).
- i18n.
