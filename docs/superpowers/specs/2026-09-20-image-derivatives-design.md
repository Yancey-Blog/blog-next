# Image Derivatives: AVIF/WebP Width Tiers + Blur-Up Placeholders

Date: 2026-09-20
Status: Approved design, pending implementation plan

## Goal

Serve every first-party image on the public site as a `<picture>` with AVIF and
WebP sources in several widths, falling back to the untouched original. Show a
blurred low-quality placeholder (LQIP) that fades into the full image.

Stored data does not change. Image URLs in `blogs`, `blogVersions`, `settings`
and the Meiji tables keep pointing at the original file. Everything else is
derived from that URL by convention, with no metadata lookup at render time.

## Current State

- Images are uploaded from the admin browser straight to S3 through a presigned
  PUT (`lib/s3.ts`, `lib/trpc/routers/upload.ts`). Eight copies of the
  presign-then-PUT code live in seven components.
- `static.yancey.app` is a CloudFront distribution in front of the bucket.
- `next.config.ts` sets `images.unoptimized: true`, so `next/image` is a
  pass-through.
- Post bodies are stored HTML rendered with `dangerouslySetInnerHTML`. BlockNote
  emits `<img src alt width>` (optionally inside `<figure>`), where `width` is
  the display width chosen in the editor. There is no `height`.
- The home hero is a CSS `background-image`.
- Some legacy originals are served as `application/octet-stream`.

## Design

### 1. Storage convention

Originals stay where they are. Derivatives live under `_derived/`, in a folder
named after the original's full key:

```
abc_4032x3024.jpeg                          original (new upload)
_derived/abc_4032x3024.jpeg/w480.avif
_derived/abc_4032x3024.jpeg/w480.webp
_derived/abc_4032x3024.jpeg/w960.avif       ... one pair per tier
_derived/abc_4032x3024.jpeg/lqip.webp       written last = completion marker
```

The full key (including extension) is used because legacy keys follow a
different naming scheme and could collide once the extension is dropped.

New uploads carry their EXIF-oriented pixel dimensions in the file name:
`{uuid}_{width}x{height}.{ext}`. This is the only channel that carries
generation-time knowledge to the render side.

**Eligibility** (identical on both sides): host is `static.yancey.app`, path is
not under `_derived/` or `tmp/`, extension matches `/\.(jpe?g|png)$/i`.
GIF, SVG, WebP originals and videos are left alone.

**Tiers.** Standard widths are `[480, 960, 1440, 2400]`; 2400 is the cap.

| URL shape                               | Tiers generated and referenced                                                                           | `width`/`height` attrs |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------- |
| `abc_4032x3024.jpeg` (dimensions known) | standard widths below `min(W, 2400)`, plus `min(W, 2400)`                                                | yes                    |
| `ng9bwfv1-1728444113930.jpeg` (legacy)  | all four standard widths; a tier wider than the original is encoded at the original size, never upscaled | no                     |

Examples for known widths: 300 → `[300]`; 1200 → `[480, 960, 1200]`;
4032 → `[480, 960, 1440, 2400]`.

**Encoding.** AVIF quality 50 (effort 4), WebP quality 80. LQIP is a 24px-wide
WebP at quality 30. All derivatives are auto-oriented from EXIF, converted to
sRGB, stripped of metadata, and written with
`Cache-Control: public, max-age=31536000, immutable`. Quality constants live in
one place for later tuning.

### 2. Shared pure module: `lib/images/derivatives.ts`

No dependencies on Node, sharp or React; imported by the generator, the
components and the HTML transform.

- `parseImageUrl(url)` → `{ origin, pathname, key, width?, height? } | null`
  (null when not eligible).
- `planTiers(width: number | null)` → `number[]`.
- `buildSources(url)` → `{ avifSrcSet, webpSrcSet, lqipUrl, width?, height? } | null`.
  Derivative URLs are built as `${origin}/_derived${pathname}/w{N}.{fmt}` so the
  original URL's encoding is preserved.
- `derivedKey(key, tier, format)` and `lqipKey(key)` → the S3 keys the generator
  writes.
- `tmpKeyFor`, `finalKeyFor`, `publicUrlFor`, `contentTypeForKey` → upload key
  helpers, so the router and the generator agree on key shapes.
- Constants: public origin, prefixes, standard widths, cap, LQIP width.
  `lib/s3.ts` reuses the public-origin constant instead of its hardcoded string.

### 3. Generation

**`lib/images/process.ts`** (server only, adds the `sharp` dependency):

- Storage goes through a four-method `ObjectStore` interface (`get`, `put`,
  `copy`, `delete`). Production uses `lib/images/s3-store.ts`; tests use an
  in-memory map, so sharp runs for real without mocking the AWS SDK.
- `generateDerivatives(store, key, buffer)` writes every tier in both formats,
  then `lqip.webp` last. Tiers follow the dimensions in `key`; a key without
  dimensions gets the legacy rule.
- `processUploadedImage(store, tmpKey)`:
  1. GetObject the temp upload.
  2. Read EXIF-oriented width and height with sharp.
  3. Compute the final key `{uuid}_{W}x{H}.{ext}`.
  4. `generateDerivatives` under `_derived/{finalKey}/`.
  5. CopyObject temp → final key (correct Content-Type, immutable cache header).
  6. DeleteObject the temp key.
  7. Return `{ publicUrl, width, height }`.

**`upload.getPresignedUrl`**: for `image/jpeg` and `image/png` the key becomes
`tmp/{uuid}.{ext}` and the response gains `needsProcessing: true`. Here `ext` is
derived from the content type (`jpeg` or `png`), not from the file name, so the
key always matches the `processImage` validation below. Other types behave as
today, with `needsProcessing: false`.

**`upload.processImage`** (new `protectedProcedure` mutation): input
`{ fileKey }` validated against `^tmp/[0-9a-f-]{36}\.(jpeg|png)$`; runs
`processUploadedImage` synchronously and returns the final URL. Synchronous on
purpose: failures surface in the editor immediately, and a URL is never handed
out before its derivatives exist. Expected cost is a few seconds for a phone
photo.

A failure mid-way leaves orphans under `tmp/` and possibly `_derived/`; both are
harmless. An S3 lifecycle rule expiring `tmp/` after one day is optional.

**`lib/hooks/use-upload-file.ts`**: `useUploadFile()` returns
`uploadFile(file): Promise<string>` doing presign → PUT → `processImage` when
`needsProcessing` → final URL. It replaces the duplicated code in
`blog-editor`, `blog-image-upload`, `hero-image-settings`,
`open-source-settings`, `meiji-scrapbook-manager`, `meiji-profile-form` and
`meiji-media-manager` (two call sites). Each component keeps its own validation
and progress UI.

**Backfill: `scripts/backfill-image-derivatives.ts`** (`npm run images:backfill`,
run with `tsx --env-file=.env`):

- Lists the bucket, skipping `_derived/` and `tmp/`, keeping eligible keys.
- Skips keys whose `lqip.webp` already exists. Flags: `--dry-run`, `--force`,
  `--only <key>`.
- Calls the same `generateDerivatives`; legacy keys get the fixed four tiers,
  dimension-bearing keys get exact tiers.
- Repairs originals whose Content-Type is `application/octet-stream` with an
  in-place CopyObject (`MetadataDirective: REPLACE`). The bucket is versioned,
  so this is reversible.
- Concurrency 3. Prints processed / skipped / failed; exits non-zero on any
  failure.

### 4. Rendering

**`components/picture.tsx`** (no `'use client'`): props `src`, `alt`, `sizes`,
optional `priority`, `fill`, `className`, `onLoad`, `onError`. Eligible URLs
render AVIF and WebP `<source>` elements plus an `<img>` pointing at the
original, with `width`/`height` when known. Other URLs render a plain `<img>`.
Plain `<img>` attributes (`loading`, `decoding`, `fetchPriority`) replace
`next/image`, which is a pass-through under `unoptimized: true`.

**`components/lazy-load-image.tsx`**: two layers. The bottom layer is the LQIP,
stretched, Gaussian-blurred and slightly scaled up. The top layer is `Picture`,
transparent until loaded, then a 500ms fade; the bottom layer is removed
afterwards.

- Ineligible URLs keep today's pulsing skeleton.
- A failed derivative retries once with the plain original before showing the
  existing error icon.
- On mount it checks `img.complete` so cache hits that finish before hydration
  do not stay transparent.
- `priority` images skip the opacity gate and paint directly over the LQIP, so
  LCP is not delayed by JavaScript.
- Honors `prefers-reduced-motion`.
- New `sizes` prop; each caller passes a value matching its layout (cards:
  `(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw`; post cover:
  `(min-width: 896px) 896px, 100vw`).

**`lib/images/transform-html.ts`**: `transformContentImages(html)` uses cheerio
with `load(html, null, false)` / `$.html()`, the same round trip the stored HTML
already went through in `highlightHtml`. Each eligible `<img>` becomes:

```html
<span class="img-blur" style="--lqip:url(.../lqip.webp);aspect-ratio:4032/3024">
  <picture>
    <source
      type="image/avif"
      srcset="..."
      sizes="(min-width: 896px) 896px, 100vw"
    />
    <source
      type="image/webp"
      srcset="..."
      sizes="(min-width: 896px) 896px, 100vw"
    />
    <img
      src="original"
      width="4032"
      height="3024"
      loading="lazy"
      decoding="async"
      alt="..."
    />
  </picture>
</span>
```

`app/globals.css` forces body images to the full column width
(`width: 100% !important; height: auto !important`), so BlockNote's `width`
attribute has no visual effect on the public site. The transform therefore
ignores it: `sizes` is always `(min-width: 896px) 896px, 100vw` (the article
column is `max-w-4xl`), the wrapper is a full-width block, and `width`/`height`
carry the intrinsic dimensions from the URL so the browser reserves the right
space. All other attributes on the original `<img>` (`alt`, `data-*`) are kept.
Legacy images get no `height` and no `aspect-ratio`. The blurred layer is a
`::before` reading `--lqip`, styled in `app/globals.css`.

The post page calls the transform on `highlightedContent || content` at render
time. Stored HTML, Algolia records, the markdown route, version diffs and
`og:image` are untouched.

**`components/blog-content-images.tsx`** (client): a tiny sibling component,
`<BlogContentImages containerId="blog-content" />`, rendered next to the
server-rendered `<div id="blog-content" dangerouslySetInnerHTML>`. It does not
wrap the HTML, so the article body is not serialized a second time into the
RSC payload. On mount it attaches capture-phase `load` and `error` listeners to
the container. Load marks the wrapper so CSS fades the image in. Error removes
the `<source>` siblings and falls back to the original. Images stay visible by
default, so nothing is stuck transparent when JavaScript does not run.

Body blur-up needs a reserved box, so it is only visible for images whose URL
carries dimensions. Legacy body images still get AVIF/WebP sources but keep
today's layout behaviour. Cards, covers and the hero sit in externally sized
containers, so they get the full blur-up for legacy images as well.

`LazyLoadImage` always lays out both layers as absolute fills of its wrapper,
because the placeholder and the image must share one geometry. Every caller
already places it in a sized, positioned container. The visible change: covers
that are not 16:9 are now centre-cropped instead of top-aligned.

**Other surfaces**: `ParallaxHero` renders a `Picture` (`sizes="100vw"`,
`priority`) inside the transformed layer instead of a CSS background. The post
cover, open-source logos, Meiji avatar and lightbox move to `Picture` or
`LazyLoadImage`. Admin previews are unchanged.

## Error Handling

- Upload: any failure in `processImage` throws; the hook passes it to the
  component's existing error UI. No half-success state exists because the final
  URL is returned only after everything is written.
- Render: a missing derivative falls back to the original. This is a safety
  net, not the normal path.
- Backfill: per-key try/catch, failures listed at the end, non-zero exit.

## Risks

- **IAM permissions.** Verified on 2026-09-20 with the credentials in `.env`:
  ListBucket, PutObject, HeadObject, GetObject, CopyObject with replaced
  metadata, and DeleteObject all succeed under the root, `tmp/` and `_derived/`.
  The Vercel deployment must use credentials with the same rights.
- **Processing time.** AVIF encoding dominates. If large uploads feel slow, the
  effort constant is the first knob.
- **Cached Content-Type.** CloudFront may keep serving the old
  `application/octet-stream` header for repaired originals until its cache
  expires or is invalidated. Cosmetic only.

## Testing

Vitest under `__tests__/lib/images/`, written test-first:

- `derivatives`: new-format, legacy, external, GIF, upper-case extension and
  `_derived/` URLs; tiers for widths 300, 480, 1200, 2400, 4032 and unknown;
  derivative URL and key building.
- `transform-html`: bare and `<figure>`-wrapped images, external images left
  alone, intrinsic `width`/`height` and `aspect-ratio` from the URL, legacy
  images without them, and a Shiki
  block that must come out byte-identical.
- `picture`: `renderToStaticMarkup` output for eligible, legacy and external
  URLs.
- `process`: an in-memory fixture image with an in-memory object store; asserts keys,
  Content-Types, cache headers, `lqip.webp` written last, and oriented
  dimensions for an EXIF-rotated input.
- `npm run lint`, `npm run test`, `npm run build`.

The blur-up behaviour is verified manually in a browser against the local dev
server, which reads the existing `.env`.

## Rollout

1. Finish code and tests on `feat/image-derivatives`.
2. Run the backfill from the branch. Nothing reads `_derived/` yet, so this is
   purely additive.
3. Merge and deploy. Every existing image already has derivatives.
4. Run the backfill again to cover images uploaded with the old code between
   steps 2 and 3.

`CLAUDE.md` gains an "Image pipeline" section describing the convention.

## Out of Scope

WebP, GIF and SVG originals; videos; admin preview images; JPEG width tiers;
`<link rel="preload">` for priority images; per-image metadata files or a media
table; renaming legacy originals; cleaning up derivatives when an image is
removed; Vercel Image Optimization.
