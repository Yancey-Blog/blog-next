# Meiji: Remove Featured Tweets + Enhance Daily Meiji Feed

Date: 2026-05-23

## Context

The Meiji cat site (`meiji.yanceyleo.com`, served from `app/meiji/*`) has three
content sections: a hero scrapbook, a "Daily Meiji" media feed, and a "Featured
Tweets" section. In practice the Daily Meiji media feed covers everything the
owner needs, so Featured Tweets is being removed. The media feed is also gaining
a few quality-of-life improvements.

## Goals

1. **Remove Featured Tweets entirely** — frontend, admin, tRPC, service,
   validation, the `react-tweet` dependency, and the stored settings row.
2. **One video at a time** — playing a video pauses any other playing video, so
   audio never overlaps.
3. **Daily Meiji card** — show relative upload time and support click-to-zoom
   into a carousel lightbox over all media.
4. **Admin media editing** — edit caption, milestone, date, and replace the file.

## Part 1 — Remove Featured Tweets

**Delete:**

- `components/meiji/meiji-featured-tweets.tsx`
- `components/meiji/meiji-tweet-card.tsx`
- `components/meiji-tweets-manager.tsx`

**Edit:**

- `app/meiji/page.tsx` — remove the import, the `getFeaturedTweets()` entry in
  `Promise.all`, and the `<MeijiFeaturedTweets>` render.
- `app/(cms)/admin/meiji-management/page.tsx` — remove the import, the
  `getFeaturedTweets` prefetch, the `<MeijiTweetsManager>` render, and trim the
  page description copy.
- `lib/services/meiji.service.ts` — remove `getFeaturedTweets`,
  `setFeaturedTweets`, the `FEATURED_TWEETS_KEY` constant, and the now-unused
  `FeaturedTweet` import.
- `lib/trpc/routers/meiji.ts` — remove the `getFeaturedTweets` and
  `setFeaturedTweets` procedures and the `featuredTweetsSchema` import.
- `lib/validations/meiji.ts` — remove `featuredTweetSchema`,
  `featuredTweetsSchema`, the `FeaturedTweet` type, and `parseTweetId`
  (used only by the deleted tweet code).
- `package.json` — remove the `react-tweet` dependency (only consumer is the
  deleted tweet card); refresh the lockfile.

**Database:** Featured tweets are stored only as a `settings` row keyed
`meiji_featured_tweets` (no dedicated table / migration). Delete that orphan row.

## Part 2 — Single video playback

A small client-side **video coordinator** shared by the feed and the lightbox.
When any `<video>` fires `play`, the previously-active video is paused.

- Implemented as a React context (`MeijiVideoProvider` + `useMeijiVideo`) that
  holds a ref to the currently-playing element and exposes `activate(el)`, which
  pauses the prior element if it differs.
- Every `<video>` in the feed and the lightbox calls
  `onPlay={(e) => activate(e.currentTarget)}`.
- Pure pause-others logic is unit-tested.

## Part 3 — Card: upload time + click-to-zoom carousel

**Card** (`components/meiji/meiji-media-feed.tsx`):

- Display relative upload time via
  `formatDistanceToNow(item.takenAt, { addSuffix: true })` (date-fns), styled
  with the existing meiji CSS tokens.
- Open a lightbox at the item's index: clicking a photo body opens it; videos
  keep their inline controls and get a corner expand button that opens it.

**New `MeijiMediaLightbox`:**

- A `Dialog` (large) containing the shadcn `Carousel`
  (`components/ui/carousel.tsx`) with `opts={{ startIndex }}`.
- Each slide renders a large photo or a `<video controls>` plus
  caption / milestone / relative time.
- On slide change (`api.on('select')`) the off-screen video is paused (single
  play + no lingering audio), reinforced by the coordinator from Part 2.
- ESC / overlay closes; arrows + keyboard navigate (built into the carousel).

## Part 4 — Admin media editing

`components/meiji-media-manager.tsx` gains an **Edit** action per existing tile,
opening a dialog to change:

- caption
- milestone
- date (`takenAt`, via a `datetime-local` input → ISO)
- replace the media file (re-upload through the existing presigned-URL flow →
  new S3 `url` + derived `type`)

Wires to the existing `trpc.meiji.updateMedia` mutation, which already accepts
`url`, `type`, `caption`, `milestone`, and `takenAt`. **No router/schema
changes needed** — UI only.

## Testing & verification

- Vitest unit test for the coordinator's pause-others logic.
- `npm run lint`, `tsc --noEmit`, and `npm run build` must pass.
