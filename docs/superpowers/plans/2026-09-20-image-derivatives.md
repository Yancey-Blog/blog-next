# Image Derivatives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve every first-party image as a `<picture>` with AVIF and WebP width tiers plus a blur-up placeholder, without changing any stored URL.

**Architecture:** Derivative files live at S3 keys that can be computed from the original URL alone, so the render side never looks anything up. New uploads go through a server-side `processImage` step that measures the image with sharp, writes the derivatives, and renames the original so its dimensions are part of the file name. One pure module (`lib/images/derivatives.ts`) owns the naming rules and is shared by the generator, the React components and the HTML transform.

**Tech Stack:** Next.js 16 (App Router), tRPC 11, TanStack Query, sharp, AWS SDK v3 (S3), cheerio, Tailwind CSS v4, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-20-image-derivatives-design.md`

## Global Constraints

- Package manager is **pnpm**. Run scripts as `pnpm test`, `pnpm lint`, `pnpm build`.
- Code style is enforced by oxfmt: single quotes, no semicolons, no trailing commas, 2-space indent. Run `pnpm format` before each commit.
- All backend calls go through tRPC routers in `lib/trpc/routers/`. Never add REST routes.
- Secrets come from the existing `.env`. Do not create `.env.local`.
- Public image origin is exactly `https://static.yancey.app`. Derivatives live under `_derived/`, temporary uploads under `tmp/`.
- Standard widths are exactly `[480, 960, 1440, 2400]`; the cap is `2400`; the LQIP is `24` px wide.
- Encoding: AVIF quality 50 effort 4, WebP quality 80, LQIP WebP quality 30.
- Only `jpg`, `jpeg` and `png` originals (case-insensitive) are processed or wrapped in `<picture>`. GIF, SVG, WebP originals and videos are untouched.
- Stored data (`blogs`, `blogVersions`, `settings`, Meiji tables) is never rewritten. Admin preview images are not changed.
- This is Next.js 16. Before using any Next API you are unsure about, read the matching guide in `node_modules/next/dist/docs/`.
- End every commit message with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## File Structure

| File                                          | Responsibility                                                                                                                    |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `lib/images/derivatives.ts` (new)             | Pure naming rules: eligibility, dimension parsing, tier planning, derivative keys and URLs, upload key helpers                    |
| `lib/images/process.ts` (new)                 | sharp work: read oriented size, generate derivatives, process a temp upload. Talks to storage through the `ObjectStore` interface |
| `lib/images/s3-store.ts` (new)                | `ObjectStore` backed by S3, plus `headObject` and `listAllKeys` for the backfill                                                  |
| `lib/images/transform-html.ts` (new)          | Rewrites eligible `<img>` tags in post HTML into blur-up `<picture>` markup                                                       |
| `lib/s3.ts` (modify)                          | Presigned key now goes to `tmp/` for jpeg/png; returns `needsProcessing`                                                          |
| `lib/trpc/routers/upload.ts` (modify)         | New `processImage` mutation                                                                                                       |
| `lib/hooks/use-upload-file.ts` (new)          | Client hook: presign, PUT, process, return final URL                                                                              |
| `components/picture.tsx` (new)                | `<picture>` with AVIF/WebP sources, server and client compatible                                                                  |
| `components/lazy-load-image.tsx` (modify)     | Blur-up on top of `Picture`                                                                                                       |
| `components/blog-content-images.tsx` (new)    | Client enhancer: fade-in and fallback for post body images                                                                        |
| `scripts/backfill-image-derivatives.ts` (new) | One-off and re-runnable backfill for existing images                                                                              |
| 7 upload components (modify)                  | Use `useUploadFile` instead of copy-pasted presign code                                                                           |
| 8 public image surfaces (modify)              | Use `Picture` / `LazyLoadImage` with a `sizes` value                                                                              |

---

### Task 1: Shared naming module

**Files:**

- Create: `lib/images/derivatives.ts`
- Test: `__tests__/lib/images/derivatives.test.ts`

**Interfaces:**

- Consumes: nothing.
- Produces (all exported from `@/lib/images/derivatives`):
  - Constants `IMAGE_ORIGIN`, `DERIVED_PREFIX`, `TMP_PREFIX`, `STANDARD_WIDTHS`, `MAX_WIDTH`, `LQIP_WIDTH`, `TMP_KEY_PATTERN`
  - `type DerivedFormat = 'avif' | 'webp'`
  - `isEligibleKey(key: string): boolean`
  - `parseDimensions(key: string): { width: number; height: number } | null`
  - `parseImageUrl(url: string): ParsedImageUrl | null` where `ParsedImageUrl = { origin: string; pathname: string; key: string; width?: number; height?: number }`
  - `planTiers(width: number | null): number[]`
  - `derivedKey(key: string, tier: number, format: DerivedFormat): string`
  - `lqipKey(key: string): string`
  - `buildSources(url: string): ImageSources | null` where `ImageSources = { avifSrcSet: string; webpSrcSet: string; lqipUrl: string; width?: number; height?: number }`
  - `tmpKeyFor(uuid: string, contentType: string): string | null`
  - `finalKeyFor(tmpKey: string, width: number, height: number): string`
  - `publicUrlFor(key: string): string`
  - `contentTypeForKey(key: string): 'image/png' | 'image/jpeg'`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/images/derivatives.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  buildSources,
  contentTypeForKey,
  derivedKey,
  finalKeyFor,
  isEligibleKey,
  lqipKey,
  parseImageUrl,
  planTiers,
  publicUrlFor,
  TMP_KEY_PATTERN,
  tmpKeyFor
} from '@/lib/images/derivatives'

const UUID = '3f2b8c1e-9d4a-4f6b-8a21-5c7e9b0d1f23'
const ORIGIN = 'https://static.yancey.app'

describe('parseImageUrl', () => {
  it('reads dimensions from a new-format URL', () => {
    expect(parseImageUrl(`${ORIGIN}/${UUID}_4032x3024.jpeg`)).toEqual({
      origin: ORIGIN,
      pathname: `/${UUID}_4032x3024.jpeg`,
      key: `${UUID}_4032x3024.jpeg`,
      width: 4032,
      height: 3024
    })
  })

  it('accepts a legacy URL without dimensions', () => {
    expect(parseImageUrl(`${ORIGIN}/ng9bwfv1-1728444113930.jpeg`)).toEqual({
      origin: ORIGIN,
      pathname: '/ng9bwfv1-1728444113930.jpeg',
      key: 'ng9bwfv1-1728444113930.jpeg'
    })
  })

  it('is case-insensitive about the extension', () => {
    expect(parseImageUrl(`${ORIGIN}/IMG_0001.JPG`)?.key).toBe('IMG_0001.JPG')
    expect(parseImageUrl(`${ORIGIN}/shot.PNG`)?.key).toBe('shot.PNG')
  })

  it('ignores a query string', () => {
    expect(parseImageUrl(`${ORIGIN}/a.png?v=2`)?.key).toBe('a.png')
  })

  it('decodes the key but keeps the encoded pathname', () => {
    const parsed = parseImageUrl(`${ORIGIN}/my%20photo.jpeg`)
    expect(parsed?.key).toBe('my photo.jpeg')
    expect(parsed?.pathname).toBe('/my%20photo.jpeg')
  })

  it.each([
    ['another host', 'https://lh3.googleusercontent.com/a/photo.jpeg'],
    ['plain http', 'http://static.yancey.app/a.jpeg'],
    ['gif', `${ORIGIN}/anim.gif`],
    ['webp', `${ORIGIN}/a.webp`],
    ['svg', `${ORIGIN}/logo.svg`],
    ['video', `${ORIGIN}/clip.mp4`],
    ['a derivative', `${ORIGIN}/_derived/a.jpeg/w480.avif`],
    [
      'a derived folder that ends in an eligible name',
      `${ORIGIN}/_derived/a.jpeg`
    ],
    ['a temp upload', `${ORIGIN}/tmp/${UUID}.jpeg`],
    ['a relative path', '/images/a.jpeg'],
    ['garbage', 'not a url']
  ])('returns null for %s', (_label, url) => {
    expect(parseImageUrl(url)).toBeNull()
  })
})

describe('planTiers', () => {
  it.each([
    [300, [300]],
    [480, [480]],
    [500, [480, 500]],
    [1200, [480, 960, 1200]],
    [2400, [480, 960, 1440, 2400]],
    [4032, [480, 960, 1440, 2400]]
  ])('plans exact tiers for a %ipx original', (width, expected) => {
    expect(planTiers(width)).toEqual(expected)
  })

  it('plans the four standard tiers when the width is unknown', () => {
    expect(planTiers(null)).toEqual([480, 960, 1440, 2400])
  })
})

describe('derivative keys', () => {
  it('nests derivatives under the full original key', () => {
    expect(derivedKey('a_10x10.jpeg', 480, 'avif')).toBe(
      '_derived/a_10x10.jpeg/w480.avif'
    )
    expect(derivedKey('dir/a.png', 960, 'webp')).toBe(
      '_derived/dir/a.png/w960.webp'
    )
    expect(lqipKey('a_10x10.jpeg')).toBe('_derived/a_10x10.jpeg/lqip.webp')
  })
})

describe('buildSources', () => {
  it('builds exact srcsets and dimensions for a new-format URL', () => {
    const base = `${ORIGIN}/_derived/${UUID}_1200x800.jpeg`
    expect(buildSources(`${ORIGIN}/${UUID}_1200x800.jpeg`)).toEqual({
      avifSrcSet: `${base}/w480.avif 480w, ${base}/w960.avif 960w, ${base}/w1200.avif 1200w`,
      webpSrcSet: `${base}/w480.webp 480w, ${base}/w960.webp 960w, ${base}/w1200.webp 1200w`,
      lqipUrl: `${base}/lqip.webp`,
      width: 1200,
      height: 800
    })
  })

  it('builds the four standard tiers for a legacy URL', () => {
    const base = `${ORIGIN}/_derived/old.jpeg`
    const sources = buildSources(`${ORIGIN}/old.jpeg`)
    expect(sources?.webpSrcSet).toBe(
      `${base}/w480.webp 480w, ${base}/w960.webp 960w, ${base}/w1440.webp 1440w, ${base}/w2400.webp 2400w`
    )
    expect(sources?.width).toBeUndefined()
    expect(sources?.height).toBeUndefined()
  })

  it('keeps the original percent-encoding', () => {
    expect(buildSources(`${ORIGIN}/my%20photo.jpeg`)?.lqipUrl).toBe(
      `${ORIGIN}/_derived/my%20photo.jpeg/lqip.webp`
    )
  })

  it('returns null for ineligible URLs', () => {
    expect(buildSources(`${ORIGIN}/anim.gif`)).toBeNull()
    expect(buildSources('https://example.com/a.jpeg')).toBeNull()
  })
})

describe('upload keys', () => {
  it('issues temp keys only for jpeg and png', () => {
    expect(tmpKeyFor(UUID, 'image/jpeg')).toBe(`tmp/${UUID}.jpeg`)
    expect(tmpKeyFor(UUID, 'image/png')).toBe(`tmp/${UUID}.png`)
    expect(tmpKeyFor(UUID, 'image/webp')).toBeNull()
    expect(tmpKeyFor(UUID, 'image/gif')).toBeNull()
    expect(tmpKeyFor(UUID, 'video/mp4')).toBeNull()
  })

  it('issues temp keys that match TMP_KEY_PATTERN', () => {
    expect(TMP_KEY_PATTERN.test(tmpKeyFor(UUID, 'image/jpeg')!)).toBe(true)
    expect(TMP_KEY_PATTERN.test(`tmp/${UUID}.jpg`)).toBe(false)
    expect(TMP_KEY_PATTERN.test(`tmp/../${UUID}.jpeg`)).toBe(false)
    expect(TMP_KEY_PATTERN.test(`${UUID}.jpeg`)).toBe(false)
  })

  it('puts the dimensions into the final key', () => {
    expect(finalKeyFor(`tmp/${UUID}.jpeg`, 4032, 3024)).toBe(
      `${UUID}_4032x3024.jpeg`
    )
    expect(finalKeyFor(`tmp/${UUID}.png`, 800, 600)).toBe(`${UUID}_800x600.png`)
  })

  it('rejects keys that are not temp uploads', () => {
    expect(() => finalKeyFor('abc.jpeg', 1, 1)).toThrow(
      'Not a temporary upload key'
    )
  })

  it('round-trips: final key -> public URL -> parsed dimensions', () => {
    const url = publicUrlFor(finalKeyFor(`tmp/${UUID}.jpeg`, 4032, 3024))
    expect(url).toBe(`${ORIGIN}/${UUID}_4032x3024.jpeg`)
    expect(parseImageUrl(url)).toMatchObject({ width: 4032, height: 3024 })
  })

  it('percent-encodes each path segment of a public URL', () => {
    expect(publicUrlFor('dir/my photo.jpeg')).toBe(
      `${ORIGIN}/dir/my%20photo.jpeg`
    )
  })
})

describe('helpers', () => {
  it('maps keys to content types', () => {
    expect(contentTypeForKey('a.png')).toBe('image/png')
    expect(contentTypeForKey('a.PNG')).toBe('image/png')
    expect(contentTypeForKey('a.jpg')).toBe('image/jpeg')
    expect(contentTypeForKey('a_1x1.jpeg')).toBe('image/jpeg')
  })

  it('knows which keys are eligible', () => {
    expect(isEligibleKey('a.jpeg')).toBe(true)
    expect(isEligibleKey('dir/a.JPG')).toBe(true)
    expect(isEligibleKey('a.gif')).toBe(false)
    expect(isEligibleKey('_derived/a.jpeg/w480.avif')).toBe(false)
    expect(isEligibleKey('_derived/a.jpeg')).toBe(false)
    expect(isEligibleKey('tmp/a.jpeg')).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run __tests__/lib/images/derivatives.test.ts`
Expected: FAIL. The error mentions that `@/lib/images/derivatives` cannot be resolved.

- [ ] **Step 3: Write the implementation**

Create `lib/images/derivatives.ts`:

```ts
/**
 * Naming conventions for image derivatives.
 *
 * Pure module: no Node, sharp or React imports. The generator, the React
 * components and the HTML transform all import it, so they can never disagree
 * about which derivative files exist for a given original.
 */

export const IMAGE_ORIGIN = 'https://static.yancey.app'
export const DERIVED_PREFIX = '_derived/'
export const TMP_PREFIX = 'tmp/'
export const STANDARD_WIDTHS: readonly number[] = [480, 960, 1440, 2400]
export const MAX_WIDTH = 2400
export const LQIP_WIDTH = 24

export type DerivedFormat = 'avif' | 'webp'

/** Matches keys issued by `tmpKeyFor`; also the input guard for `processImage`. */
export const TMP_KEY_PATTERN = /^tmp\/[0-9a-f-]{36}\.(jpeg|png)$/

const ELIGIBLE_EXTENSION = /\.(jpe?g|png)$/i
const DIMENSIONS_SUFFIX = /_(\d+)x(\d+)\.(?:jpe?g|png)$/i

export interface ParsedImageUrl {
  origin: string
  /** Percent-encoded, with a leading slash, exactly as it appears in the URL. */
  pathname: string
  /** Decoded S3 key. */
  key: string
  width?: number
  height?: number
}

export interface ImageSources {
  avifSrcSet: string
  webpSrcSet: string
  lqipUrl: string
  width?: number
  height?: number
}

/** True for originals that get derivatives: jpg/jpeg/png outside our own prefixes. */
export function isEligibleKey(key: string): boolean {
  return (
    !key.startsWith(DERIVED_PREFIX) &&
    !key.startsWith(TMP_PREFIX) &&
    ELIGIBLE_EXTENSION.test(key)
  )
}

/** Reads `_{width}x{height}` from a new-format key. Null for legacy keys. */
export function parseDimensions(
  key: string
): { width: number; height: number } | null {
  const match = DIMENSIONS_SUFFIX.exec(key)
  if (!match) return null
  const width = Number(match[1])
  const height = Number(match[2])
  if (width <= 0 || height <= 0) return null
  return { width, height }
}

/** Null unless the URL points at an eligible original on our image origin. */
export function parseImageUrl(url: string): ParsedImageUrl | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.origin !== IMAGE_ORIGIN) return null

  let key: string
  try {
    key = decodeURIComponent(parsed.pathname.slice(1))
  } catch {
    return null
  }
  if (!isEligibleKey(key)) return null

  return {
    origin: parsed.origin,
    pathname: parsed.pathname,
    key,
    ...parseDimensions(key)
  }
}

/**
 * Known width: the standard widths below min(width, MAX_WIDTH), plus that value.
 * Unknown width (legacy key): all standard widths. The generator never upscales,
 * so a legacy tier wider than its original holds an original-size encode.
 */
export function planTiers(width: number | null): number[] {
  if (width === null) return [...STANDARD_WIDTHS]
  const top = Math.min(width, MAX_WIDTH)
  return [...STANDARD_WIDTHS.filter((standard) => standard < top), top]
}

export function derivedKey(
  key: string,
  tier: number,
  format: DerivedFormat
): string {
  return `${DERIVED_PREFIX}${key}/w${tier}.${format}`
}

export function lqipKey(key: string): string {
  return `${DERIVED_PREFIX}${key}/lqip.webp`
}

/** Everything a `<picture>` needs, computed from the original URL alone. */
export function buildSources(url: string): ImageSources | null {
  const parsed = parseImageUrl(url)
  if (!parsed) return null

  const base = `${parsed.origin}/${DERIVED_PREFIX.slice(0, -1)}${parsed.pathname}`
  const tiers = planTiers(parsed.width ?? null)
  const srcSet = (format: DerivedFormat) =>
    tiers.map((tier) => `${base}/w${tier}.${format} ${tier}w`).join(', ')

  return {
    avifSrcSet: srcSet('avif'),
    webpSrcSet: srcSet('webp'),
    lqipUrl: `${base}/lqip.webp`,
    width: parsed.width,
    height: parsed.height
  }
}

const TMP_EXTENSION_BY_CONTENT_TYPE: Record<string, 'jpeg' | 'png'> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png'
}

/** Temp key for uploads that need processing; null for every other type. */
export function tmpKeyFor(uuid: string, contentType: string): string | null {
  const extension = TMP_EXTENSION_BY_CONTENT_TYPE[contentType]
  return extension ? `${TMP_PREFIX}${uuid}.${extension}` : null
}

/** `tmp/{uuid}.jpeg` + 4032x3024 -> `{uuid}_4032x3024.jpeg` */
export function finalKeyFor(
  tmpKey: string,
  width: number,
  height: number
): string {
  if (!TMP_KEY_PATTERN.test(tmpKey)) {
    throw new Error(`Not a temporary upload key: ${tmpKey}`)
  }
  const file = tmpKey.slice(TMP_PREFIX.length)
  const dot = file.lastIndexOf('.')
  return `${file.slice(0, dot)}_${width}x${height}${file.slice(dot)}`
}

export function publicUrlFor(key: string): string {
  return `${IMAGE_ORIGIN}/${key.split('/').map(encodeURIComponent).join('/')}`
}

export function contentTypeForKey(key: string): 'image/png' | 'image/jpeg' {
  return /\.png$/i.test(key) ? 'image/png' : 'image/jpeg'
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run __tests__/lib/images/derivatives.test.ts`
Expected: PASS, all tests green.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add lib/images/derivatives.ts __tests__/lib/images/derivatives.test.ts
git commit -m "feat(images): add shared naming rules for image derivatives"
```

---

### Task 2: Derivative generation with sharp

**Files:**

- Modify: `package.json` (adds `sharp`)
- Create: `lib/images/process.ts`
- Test: `__tests__/lib/images/process.test.ts`

**Interfaces:**

- Consumes from Task 1: `contentTypeForKey`, `derivedKey`, `finalKeyFor`, `lqipKey`, `LQIP_WIDTH`, `parseDimensions`, `planTiers`, `publicUrlFor`, `TMP_KEY_PATTERN`.
- Produces (exported from `@/lib/images/process`):
  - `interface ObjectStore { get(key: string): Promise<Buffer>; put(key: string, body: Buffer, contentType: string): Promise<void>; copy(fromKey: string, toKey: string, contentType: string): Promise<void>; delete(key: string): Promise<void> }`
  - `ENCODING` constant
  - `readOrientedSize(buffer: Buffer): Promise<{ width: number; height: number }>`
  - `generateDerivatives(store: ObjectStore, key: string, buffer: Buffer): Promise<string[]>` (returns the keys it wrote, in order; tiers come from the dimensions in `key`, or the legacy rule when the key has none)
  - `processUploadedImage(store: ObjectStore, tmpKey: string): Promise<{ key: string; publicUrl: string; width: number; height: number }>`

- [ ] **Step 1: Add the dependency**

Run: `pnpm add sharp`
Expected: `sharp` appears under `dependencies` in `package.json` (0.35.x). Next.js already lists sharp as a server-external package, so no `next.config.ts` change is needed.

- [ ] **Step 2: Write the failing test**

Create `__tests__/lib/images/process.test.ts`:

```ts
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import {
  generateDerivatives,
  processUploadedImage,
  readOrientedSize,
  type ObjectStore
} from '@/lib/images/process'

const UUID = '3f2b8c1e-9d4a-4f6b-8a21-5c7e9b0d1f23'

class MemoryStore implements ObjectStore {
  objects = new Map<string, { body: Buffer; contentType: string }>()
  log: string[] = []
  failOnPut: string | null = null

  async get(key: string) {
    const object = this.objects.get(key)
    if (!object) throw new Error(`NoSuchKey: ${key}`)
    return object.body
  }

  async put(key: string, body: Buffer, contentType: string) {
    if (this.failOnPut && key.endsWith(this.failOnPut)) {
      throw new Error(`put failed: ${key}`)
    }
    this.objects.set(key, { body, contentType })
    this.log.push(`put ${key}`)
  }

  async copy(fromKey: string, toKey: string, contentType: string) {
    const object = this.objects.get(fromKey)
    if (!object) throw new Error(`NoSuchKey: ${fromKey}`)
    this.objects.set(toKey, { body: object.body, contentType })
    this.log.push(`copy ${fromKey} -> ${toKey}`)
  }

  async delete(key: string) {
    this.objects.delete(key)
    this.log.push(`delete ${key}`)
  }
}

async function fixture(
  width: number,
  height: number,
  options: { orientation?: number; format?: 'jpeg' | 'png' } = {}
) {
  let image = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 200, g: 80, b: 40 }
    }
  })
  if (options.orientation) {
    image = image.withMetadata({ orientation: options.orientation })
  }
  return options.format === 'png'
    ? image.png().toBuffer()
    : image.jpeg().toBuffer()
}

async function widthOf(store: MemoryStore, key: string) {
  const meta = await sharp(store.objects.get(key)!.body).metadata()
  return meta.width
}

describe('image processing', { timeout: 60_000 }, () => {
  describe('readOrientedSize', () => {
    it('returns the stored size for an unrotated image', async () => {
      expect(await readOrientedSize(await fixture(1200, 800))).toEqual({
        width: 1200,
        height: 800
      })
    })

    it('swaps width and height for EXIF orientation 6', async () => {
      const rotated = await fixture(1200, 800, { orientation: 6 })
      expect(await readOrientedSize(rotated)).toEqual({
        width: 800,
        height: 1200
      })
    })
  })

  describe('generateDerivatives', () => {
    it('writes exact tiers in both formats, then the LQIP last', async () => {
      const store = new MemoryStore()
      const key = `${UUID}_1200x800.jpeg`
      const written = await generateDerivatives(
        store,
        key,
        await fixture(1200, 800)
      )

      const expected = [
        `_derived/${key}/w480.avif`,
        `_derived/${key}/w480.webp`,
        `_derived/${key}/w960.avif`,
        `_derived/${key}/w960.webp`,
        `_derived/${key}/w1200.avif`,
        `_derived/${key}/w1200.webp`,
        `_derived/${key}/lqip.webp`
      ]
      expect(written).toEqual(expected)
      expect(store.log).toEqual(expected.map((k) => `put ${k}`))

      expect(await widthOf(store, `_derived/${key}/w480.avif`)).toBe(480)
      expect(await widthOf(store, `_derived/${key}/w960.webp`)).toBe(960)
      expect(await widthOf(store, `_derived/${key}/w1200.avif`)).toBe(1200)
      expect(await widthOf(store, `_derived/${key}/lqip.webp`)).toBe(24)

      expect(store.objects.get(`_derived/${key}/w480.avif`)!.contentType).toBe(
        'image/avif'
      )
      expect(store.objects.get(`_derived/${key}/w480.webp`)!.contentType).toBe(
        'image/webp'
      )
      expect(store.objects.get(`_derived/${key}/lqip.webp`)!.contentType).toBe(
        'image/webp'
      )
    })

    it('uses the four standard tiers for a legacy key and never upscales', async () => {
      const store = new MemoryStore()
      await generateDerivatives(store, 'legacy.jpeg', await fixture(600, 400))

      expect(await widthOf(store, '_derived/legacy.jpeg/w480.webp')).toBe(480)
      expect(await widthOf(store, '_derived/legacy.jpeg/w960.webp')).toBe(600)
      expect(await widthOf(store, '_derived/legacy.jpeg/w1440.avif')).toBe(600)
      expect(await widthOf(store, '_derived/legacy.jpeg/w2400.avif')).toBe(600)
      expect(store.log.at(-1)).toBe('put _derived/legacy.jpeg/lqip.webp')
    })

    it('bakes in the EXIF rotation and strips the orientation tag', async () => {
      const store = new MemoryStore()
      const key = `${UUID}_800x1200.jpeg`
      await generateDerivatives(
        store,
        key,
        await fixture(1200, 800, { orientation: 6 })
      )

      const meta = await sharp(
        store.objects.get(`_derived/${key}/w480.webp`)!.body
      ).metadata()
      expect(meta.width).toBe(480)
      expect(meta.height).toBe(720)
      expect(meta.orientation).toBeUndefined()
    })

    it('keeps transparency for PNG sources', async () => {
      const store = new MemoryStore()
      const transparent = await sharp({
        create: {
          width: 500,
          height: 500,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
      })
        .png()
        .toBuffer()
      await generateDerivatives(store, `${UUID}_500x500.png`, transparent)

      const meta = await sharp(
        store.objects.get(`_derived/${UUID}_500x500.png/w480.webp`)!.body
      ).metadata()
      expect(meta.hasAlpha).toBe(true)
    })
  })

  describe('processUploadedImage', () => {
    it('writes derivatives, renames the original, then deletes the temp key', async () => {
      const store = new MemoryStore()
      const original = await fixture(1200, 800)
      store.objects.set(`tmp/${UUID}.jpeg`, {
        body: original,
        contentType: 'image/jpeg'
      })

      const result = await processUploadedImage(store, `tmp/${UUID}.jpeg`)

      expect(result).toEqual({
        key: `${UUID}_1200x800.jpeg`,
        publicUrl: `https://static.yancey.app/${UUID}_1200x800.jpeg`,
        width: 1200,
        height: 800
      })
      const final = store.objects.get(`${UUID}_1200x800.jpeg`)!
      expect(final.contentType).toBe('image/jpeg')
      expect(final.body.equals(original)).toBe(true)
      expect(store.objects.has(`tmp/${UUID}.jpeg`)).toBe(false)
      expect(
        store.objects.has(`_derived/${UUID}_1200x800.jpeg/lqip.webp`)
      ).toBe(true)
      expect(store.log.slice(-2)).toEqual([
        `copy tmp/${UUID}.jpeg -> ${UUID}_1200x800.jpeg`,
        `delete tmp/${UUID}.jpeg`
      ])
    })

    it('names the final key after the EXIF-oriented size', async () => {
      const store = new MemoryStore()
      store.objects.set(`tmp/${UUID}.jpeg`, {
        body: await fixture(1200, 800, { orientation: 6 }),
        contentType: 'image/jpeg'
      })

      const result = await processUploadedImage(store, `tmp/${UUID}.jpeg`)
      expect(result.key).toBe(`${UUID}_800x1200.jpeg`)
    })

    it('refuses keys outside tmp/ without touching the store', async () => {
      const store = new MemoryStore()
      await expect(processUploadedImage(store, 'abc.jpeg')).rejects.toThrow(
        'Not a temporary upload key'
      )
      expect(store.log).toEqual([])
    })

    it('keeps the temp object and publishes nothing when a write fails', async () => {
      const store = new MemoryStore()
      store.failOnPut = 'lqip.webp'
      store.objects.set(`tmp/${UUID}.jpeg`, {
        body: await fixture(600, 400),
        contentType: 'image/jpeg'
      })

      await expect(
        processUploadedImage(store, `tmp/${UUID}.jpeg`)
      ).rejects.toThrow('put failed')
      expect(store.objects.has(`tmp/${UUID}.jpeg`)).toBe(true)
      expect(store.objects.has(`${UUID}_600x400.jpeg`)).toBe(false)
    })
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm vitest run __tests__/lib/images/process.test.ts`
Expected: FAIL. The error mentions that `@/lib/images/process` cannot be resolved.

- [ ] **Step 4: Write the implementation**

Create `lib/images/process.ts`:

```ts
import sharp from 'sharp'

import {
  contentTypeForKey,
  derivedKey,
  finalKeyFor,
  lqipKey,
  LQIP_WIDTH,
  parseDimensions,
  planTiers,
  publicUrlFor,
  TMP_KEY_PATTERN
} from './derivatives'

/** The storage operations image processing needs. S3 in production, a Map in tests. */
export interface ObjectStore {
  get(key: string): Promise<Buffer>
  put(key: string, body: Buffer, contentType: string): Promise<void>
  copy(fromKey: string, toKey: string, contentType: string): Promise<void>
  delete(key: string): Promise<void>
}

/** Single place to tune output quality and encode time. */
export const ENCODING = {
  avif: { quality: 50, effort: 4 },
  webp: { quality: 80 },
  lqip: { quality: 30 }
} as const

/** Pixel size after applying the EXIF orientation, which is what browsers display. */
export async function readOrientedSize(
  buffer: Buffer
): Promise<{ width: number; height: number }> {
  const { autoOrient } = await sharp(buffer).metadata()
  if (!autoOrient?.width || !autoOrient?.height) {
    throw new Error('Could not read image dimensions')
  }
  return { width: autoOrient.width, height: autoOrient.height }
}

/**
 * Writes every tier as AVIF and WebP, then the LQIP. The LQIP is written last so
 * its existence means "this image is fully processed". Tiers follow the
 * dimensions in `key`; a key without dimensions gets the legacy rule. sharp
 * drops all metadata by default, so outputs carry no EXIF.
 */
export async function generateDerivatives(
  store: ObjectStore,
  key: string,
  buffer: Buffer
): Promise<string[]> {
  const tiers = planTiers(parseDimensions(key)?.width ?? null)
  const written: string[] = []

  for (const tier of tiers) {
    const resized = sharp(buffer)
      .autoOrient()
      .resize({ width: tier, withoutEnlargement: true })
      .toColourspace('srgb')
    const [avif, webp] = await Promise.all([
      resized.clone().avif(ENCODING.avif).toBuffer(),
      resized.clone().webp(ENCODING.webp).toBuffer()
    ])

    const avifKey = derivedKey(key, tier, 'avif')
    const webpKey = derivedKey(key, tier, 'webp')
    await store.put(avifKey, avif, 'image/avif')
    await store.put(webpKey, webp, 'image/webp')
    written.push(avifKey, webpKey)
  }

  const lqip = await sharp(buffer)
    .autoOrient()
    .resize({ width: LQIP_WIDTH })
    .toColourspace('srgb')
    .webp(ENCODING.lqip)
    .toBuffer()
  await store.put(lqipKey(key), lqip, 'image/webp')
  written.push(lqipKey(key))

  return written
}

/**
 * Turns `tmp/{uuid}.jpeg` into a published image: derivatives first, then the
 * original under its final dimension-bearing key, then the temp object removed.
 * A failure at any point leaves the temp object in place and no final key, so
 * callers never receive a URL whose derivatives are missing.
 */
export async function processUploadedImage(
  store: ObjectStore,
  tmpKey: string
): Promise<{ key: string; publicUrl: string; width: number; height: number }> {
  if (!TMP_KEY_PATTERN.test(tmpKey)) {
    throw new Error(`Not a temporary upload key: ${tmpKey}`)
  }

  const buffer = await store.get(tmpKey)
  const { width, height } = await readOrientedSize(buffer)
  const key = finalKeyFor(tmpKey, width, height)

  await generateDerivatives(store, key, buffer)
  await store.copy(tmpKey, key, contentTypeForKey(key))
  await store.delete(tmpKey)

  return { key, publicUrl: publicUrlFor(key), width, height }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run __tests__/lib/images/process.test.ts`
Expected: PASS. AVIF encoding makes this file take a few seconds.

- [ ] **Step 6: Commit**

```bash
pnpm format
git add package.json pnpm-lock.yaml lib/images/process.ts __tests__/lib/images/process.test.ts
git commit -m "feat(images): generate AVIF/WebP tiers and LQIP with sharp"
```

---

### Task 3: S3 store, presigned temp keys, and the `processImage` mutation

**Files:**

- Create: `lib/images/s3-store.ts`
- Modify: `lib/s3.ts` (whole file shown below)
- Modify: `lib/trpc/routers/upload.ts` (whole file shown below)
- Test: `__tests__/lib/images/s3-store.test.ts`

**Interfaces:**

- Consumes from Task 1: `publicUrlFor`, `tmpKeyFor`, `TMP_KEY_PATTERN`. From Task 2: `ObjectStore`, `processUploadedImage`.
- Produces:
  - `@/lib/images/s3-store`: `s3ObjectStore: ObjectStore`, `IMMUTABLE_CACHE_CONTROL`, `headObject(key: string): Promise<{ contentType: string | undefined } | null>`, `listAllKeys(): Promise<string[]>`
  - `generatePresignedUploadUrl(fileName, contentType)` now resolves to `{ uploadUrl: string; fileKey: string; publicUrl: string; needsProcessing: boolean }`
  - tRPC `upload.getPresignedUrl` returns the same four fields.
  - tRPC `upload.processImage` — input `{ fileKey: string }`, output `{ publicUrl: string; width: number; height: number }`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/images/s3-store.test.ts`:

```ts
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand
} from '@aws-sdk/client-s3'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { send } = vi.hoisted(() => ({ send: vi.fn() }))

// lib/s3.ts throws at import time without AWS env vars, so replace it.
vi.mock('@/lib/s3', () => ({ s3Client: { send } }))

import {
  headObject,
  IMMUTABLE_CACHE_CONTROL,
  listAllKeys,
  s3ObjectStore
} from '@/lib/images/s3-store'

beforeEach(() => {
  send.mockReset()
  process.env.AWS_S3_BUCKET_NAME = 'test-bucket'
})

describe('s3ObjectStore', () => {
  it('puts with content type and an immutable cache header', async () => {
    send.mockResolvedValue({})
    await s3ObjectStore.put(
      '_derived/a.jpeg/w480.avif',
      Buffer.from('x'),
      'image/avif'
    )

    const command = send.mock.calls[0][0]
    expect(command).toBeInstanceOf(PutObjectCommand)
    expect(command.input).toMatchObject({
      Bucket: 'test-bucket',
      Key: '_derived/a.jpeg/w480.avif',
      ContentType: 'image/avif',
      CacheControl: IMMUTABLE_CACHE_CONTROL
    })
    expect(IMMUTABLE_CACHE_CONTROL).toBe('public, max-age=31536000, immutable')
  })

  it('copies with replaced metadata and a URL-encoded source', async () => {
    send.mockResolvedValue({})
    await s3ObjectStore.copy('tmp/a b.jpeg', 'a b_1x1.jpeg', 'image/jpeg')

    const command = send.mock.calls[0][0]
    expect(command).toBeInstanceOf(CopyObjectCommand)
    expect(command.input).toMatchObject({
      Bucket: 'test-bucket',
      Key: 'a b_1x1.jpeg',
      CopySource: 'test-bucket/tmp/a%20b.jpeg',
      MetadataDirective: 'REPLACE',
      ContentType: 'image/jpeg',
      CacheControl: IMMUTABLE_CACHE_CONTROL
    })
  })

  it('reads an object body into a Buffer', async () => {
    send.mockResolvedValue({
      Body: { transformToByteArray: async () => new Uint8Array([1, 2, 3]) }
    })
    const body = await s3ObjectStore.get('a.jpeg')
    expect(Buffer.isBuffer(body)).toBe(true)
    expect([...body]).toEqual([1, 2, 3])
  })

  it('deletes by key', async () => {
    send.mockResolvedValue({})
    await s3ObjectStore.delete('tmp/a.jpeg')
    const command = send.mock.calls[0][0]
    expect(command).toBeInstanceOf(DeleteObjectCommand)
    expect(command.input).toEqual({ Bucket: 'test-bucket', Key: 'tmp/a.jpeg' })
  })
})

describe('headObject', () => {
  it('returns the content type when the object exists', async () => {
    send.mockResolvedValue({ ContentType: 'application/octet-stream' })
    expect(await headObject('a.jpeg')).toEqual({
      contentType: 'application/octet-stream'
    })
    expect(send.mock.calls[0][0]).toBeInstanceOf(HeadObjectCommand)
  })

  it('returns null when the object does not exist', async () => {
    send.mockRejectedValue(
      Object.assign(new Error('nope'), {
        name: 'NotFound',
        $metadata: { httpStatusCode: 404 }
      })
    )
    expect(await headObject('missing.jpeg')).toBeNull()
  })

  it('rethrows other errors', async () => {
    send.mockRejectedValue(
      Object.assign(new Error('denied'), {
        name: 'AccessDenied',
        $metadata: { httpStatusCode: 403 }
      })
    )
    await expect(headObject('a.jpeg')).rejects.toThrow('denied')
  })
})

describe('listAllKeys', () => {
  it('follows continuation tokens', async () => {
    send
      .mockResolvedValueOnce({
        Contents: [{ Key: 'a.jpeg' }, { Key: 'b.png' }],
        NextContinuationToken: 'page-2'
      })
      .mockResolvedValueOnce({ Contents: [{ Key: 'c.gif' }] })

    expect(await listAllKeys()).toEqual(['a.jpeg', 'b.png', 'c.gif'])
    expect(send.mock.calls[0][0]).toBeInstanceOf(ListObjectsV2Command)
    expect(send.mock.calls[1][0].input.ContinuationToken).toBe('page-2')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run __tests__/lib/images/s3-store.test.ts`
Expected: FAIL. The error mentions that `@/lib/images/s3-store` cannot be resolved.

- [ ] **Step 3: Write the S3 store**

Create `lib/images/s3-store.ts`:

```ts
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand
} from '@aws-sdk/client-s3'

import { s3Client } from '@/lib/s3'

import type { ObjectStore } from './process'

/** Originals and derivatives never change once written, so cache them for a year. */
export const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable'

const bucket = () => process.env.AWS_S3_BUCKET_NAME as string

/** CopySource must be URL-encoded; slashes between segments stay literal. */
const encodeKey = (key: string) =>
  key.split('/').map(encodeURIComponent).join('/')

export const s3ObjectStore: ObjectStore = {
  async get(key) {
    const response = await s3Client.send(
      new GetObjectCommand({ Bucket: bucket(), Key: key })
    )
    if (!response.Body) throw new Error(`Empty S3 object: ${key}`)
    return Buffer.from(await response.Body.transformToByteArray())
  },

  async put(key, body, contentType) {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket(),
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: IMMUTABLE_CACHE_CONTROL
      })
    )
  },

  // Also used to repair metadata in place: S3 allows copying an object onto
  // itself as long as the metadata is replaced.
  async copy(fromKey, toKey, contentType) {
    await s3Client.send(
      new CopyObjectCommand({
        Bucket: bucket(),
        Key: toKey,
        CopySource: `${bucket()}/${encodeKey(fromKey)}`,
        MetadataDirective: 'REPLACE',
        ContentType: contentType,
        CacheControl: IMMUTABLE_CACHE_CONTROL
      })
    )
  },

  async delete(key) {
    await s3Client.send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }))
  }
}

function isNotFound(error: unknown): boolean {
  const candidate = error as {
    name?: string
    $metadata?: { httpStatusCode?: number }
  }
  return (
    candidate?.name === 'NotFound' ||
    candidate?.$metadata?.httpStatusCode === 404
  )
}

/** Null when the object does not exist; other errors propagate. */
export async function headObject(
  key: string
): Promise<{ contentType: string | undefined } | null> {
  try {
    const response = await s3Client.send(
      new HeadObjectCommand({ Bucket: bucket(), Key: key })
    )
    return { contentType: response.ContentType }
  } catch (error) {
    if (isNotFound(error)) return null
    throw error
  }
}

/** Every key in the bucket, across all pages. */
export async function listAllKeys(): Promise<string[]> {
  const keys: string[] = []
  let token: string | undefined
  do {
    const response = await s3Client.send(
      new ListObjectsV2Command({ Bucket: bucket(), ContinuationToken: token })
    )
    for (const object of response.Contents ?? []) {
      if (object.Key) keys.push(object.Key)
    }
    token = response.NextContinuationToken
  } while (token)
  return keys
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run __tests__/lib/images/s3-store.test.ts`
Expected: PASS.

- [ ] **Step 5: Issue temp keys from `lib/s3.ts`**

In `lib/s3.ts`, add this import below the existing `uuid` import:

```ts
import { publicUrlFor, tmpKeyFor } from '@/lib/images/derivatives'
```

Replace the whole `generatePresignedUploadUrl` function (including its doc comment) with:

```ts
/**
 * Generate a presigned URL for a direct browser upload.
 *
 * JPEG and PNG uploads land under `tmp/` and must be finished with
 * `upload.processImage`, which writes the derivatives and moves the original to
 * its final, dimension-bearing key. Every other type is published as-is.
 */
export async function generatePresignedUploadUrl(
  fileName: string,
  contentType: string
): Promise<{
  uploadUrl: string
  fileKey: string
  publicUrl: string
  needsProcessing: boolean
}> {
  const uuid = uuidv4()
  const tmpKey = tmpKeyFor(uuid, contentType)
  const fileKey = tmpKey ?? `${uuid}.${fileName.split('.').pop()}`

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: fileKey,
    ContentType: contentType
  })

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 3600 // 1 hour
  })

  return {
    uploadUrl,
    fileKey,
    publicUrl: publicUrlFor(fileKey),
    needsProcessing: tmpKey !== null
  }
}
```

In the same file, inside `uploadFileToS3`, replace

```ts
const publicUrl = `https://static.yancey.app/${fileKey}`

return publicUrl
```

with

```ts
return publicUrlFor(fileKey)
```

- [ ] **Step 6: Add the `processImage` mutation**

Replace the whole of `lib/trpc/routers/upload.ts` with:

```ts
import { z } from 'zod'

import { TMP_KEY_PATTERN } from '@/lib/images/derivatives'
import { processUploadedImage } from '@/lib/images/process'
import { s3ObjectStore } from '@/lib/images/s3-store'
import { generatePresignedUploadUrl } from '@/lib/s3'

import { protectedProcedure } from '../init'

export const uploadRouter = {
  // Get presigned URL for S3 upload
  getPresignedUrl: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        contentType: z.string()
      })
    )
    .mutation(async ({ input }) => {
      const { fileName, contentType } = input

      // Validate file type (images + videos for the Meiji media feed)
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'video/ogg'
      ]
      if (!allowedTypes.includes(contentType)) {
        throw new Error(
          'Unsupported file type. Allowed: JPEG, PNG, GIF, WebP, MP4, WebM, MOV, OGG'
        )
      }

      const { uploadUrl, publicUrl, fileKey, needsProcessing } =
        await generatePresignedUploadUrl(fileName, contentType)

      return {
        uploadUrl,
        publicUrl,
        fileKey,
        needsProcessing
      }
    }),

  // Finish a JPEG/PNG upload: write AVIF/WebP tiers and the LQIP, then move the
  // original out of tmp/. Runs synchronously so a URL is only handed out once
  // its derivatives exist, and so failures surface in the uploader right away.
  processImage: protectedProcedure
    .input(
      z.object({
        // Only keys issued by getPresignedUrl; never arbitrary bucket objects.
        fileKey: z.string().regex(TMP_KEY_PATTERN)
      })
    )
    .mutation(async ({ input }) => {
      const { publicUrl, width, height } = await processUploadedImage(
        s3ObjectStore,
        input.fileKey
      )
      return { publicUrl, width, height }
    })
}
```

- [ ] **Step 7: Verify types and the whole suite**

Run: `pnpm vitest run && pnpm exec tsc --noEmit`
Expected: all tests PASS and `tsc` prints nothing.

- [ ] **Step 8: Commit**

```bash
pnpm format
git add lib/images/s3-store.ts lib/s3.ts lib/trpc/routers/upload.ts __tests__/lib/images/s3-store.test.ts
git commit -m "feat(upload): process JPEG/PNG uploads into image derivatives"
```

---

### Task 4: One upload hook for all eight call sites

**Files:**

- Create: `lib/hooks/use-upload-file.ts`
- Modify: `components/blog-editor.tsx`, `components/blog-image-upload.tsx`, `components/hero-image-settings.tsx`, `components/open-source-settings.tsx`, `components/meiji-scrapbook-manager.tsx`, `components/meiji-profile-form.tsx`, `components/meiji-media-manager.tsx` (two call sites)

**Interfaces:**

- Consumes from Task 3: tRPC `upload.getPresignedUrl` (returns `uploadUrl`, `publicUrl`, `fileKey`, `needsProcessing`) and `upload.processImage`.
- Produces: `useUploadFile(): (file: File) => Promise<string>` from `@/lib/hooks/use-upload-file`. The returned function is referentially stable, resolves to the final public URL, and rejects on any failure.

This task has no unit test: the repo has no React hook test setup (Vitest runs in the `node` environment), and the hook is a thin sequence of three awaited calls. It is verified by the type checker here and end to end in the browser in Task 9.

- [ ] **Step 1: Create the hook**

Create `lib/hooks/use-upload-file.ts`:

```ts
'use client'

import { useMutation } from '@tanstack/react-query'
import { useCallback } from 'react'

import { useTRPC } from '@/lib/trpc/client'

/**
 * Upload a file straight to S3 and resolve to its public URL.
 *
 * JPEG and PNG uploads are finished on the server (`upload.processImage`),
 * which writes the AVIF/WebP/LQIP derivatives and returns the final URL with
 * the image dimensions in its file name. Expect that step to take a few seconds
 * for large photos. Rejects if any step fails.
 */
export function useUploadFile() {
  const trpc = useTRPC()
  const { mutateAsync: getPresignedUrl } = useMutation(
    trpc.upload.getPresignedUrl.mutationOptions()
  )
  const { mutateAsync: processImage } = useMutation(
    trpc.upload.processImage.mutationOptions()
  )

  return useCallback(
    async (file: File): Promise<string> => {
      const { uploadUrl, publicUrl, fileKey, needsProcessing } =
        await getPresignedUrl({
          fileName: file.name,
          contentType: file.type
        })

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      })
      if (!response.ok) throw new Error('Failed to upload to S3')

      if (!needsProcessing) return publicUrl

      const processed = await processImage({ fileKey })
      return processed.publicUrl
    },
    [getPresignedUrl, processImage]
  )
}
```

- [ ] **Step 2: Migrate `components/blog-editor.tsx`**

Delete these two imports (nothing else in the file uses them):

```ts
import { useMutation } from '@tanstack/react-query'
```

```ts
import { useTRPC } from '@/lib/trpc/client'
```

Add, next to the other `@/` imports:

```ts
import { useUploadFile } from '@/lib/hooks/use-upload-file'
```

Replace

```ts
const trpc = useTRPC()
const getPresignedUrl = useMutation(
  trpc.upload.getPresignedUrl.mutationOptions()
)
```

with

```ts
const uploadFile = useUploadFile()
```

Replace the `uploadFile` option passed to `useCreateBlockNote`

```ts
uploadFile: async (file: File) => {
  const { uploadUrl, publicUrl } = await getPresignedUrl.mutateAsync({
    fileName: file.name,
    contentType: file.type
  })
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file
  })
  if (!res.ok) throw new Error('Failed to upload to S3')
  return publicUrl
}
```

with

```ts
uploadFile
```

- [ ] **Step 3: Migrate `components/blog-image-upload.tsx`**

Delete the `useMutation` import (line 3) and the `useTRPC` import (line 9). Add:

```ts
import { useUploadFile } from '@/lib/hooks/use-upload-file'
```

Replace

```ts
const trpc = useTRPC()

const getPresignedUrl = useMutation(
  trpc.upload.getPresignedUrl.mutationOptions()
)
```

with

```ts
const upload = useUploadFile()
```

Inside the component's own `uploadFile` callback, replace

```ts
// Step 1: Get presigned URL
const { uploadUrl, publicUrl } = await getPresignedUrl.mutateAsync({
  fileName: file.name,
  contentType: file.type
})

// Step 2: Upload directly to S3
const uploadResponse = await fetch(uploadUrl, {
  method: 'PUT',
  headers: {
    'Content-Type': file.type
  },
  body: file
})

if (!uploadResponse.ok) {
  throw new Error('Failed to upload to S3')
}

onChange(publicUrl)
```

with

```ts
onChange(await upload(file))
```

and change that callback's dependency array from `[getPresignedUrl, onChange]` to `[upload, onChange]`.

- [ ] **Step 4: Migrate the four single-call-site settings components**

Each of these keeps its `useMutation` and `useTRPC` imports because other mutations still use them. In each file add

```ts
import { useUploadFile } from '@/lib/hooks/use-upload-file'
```

and replace

```ts
const getPresignedUrl = useMutation(
  trpc.upload.getPresignedUrl.mutationOptions()
)
```

with

```ts
const uploadFile = useUploadFile()
```

Then, in each upload handler, replace the block

```ts
const { uploadUrl, publicUrl } = await getPresignedUrl.mutateAsync({
  fileName: file.name,
  contentType: file.type
})
await fetch(uploadUrl, {
  method: 'PUT',
  body: file,
  headers: { 'Content-Type': file.type }
})
```

with

```ts
const publicUrl = await uploadFile(file)
```

The handlers are:

| File                                     | Handler              | Line that follows and stays unchanged          |
| ---------------------------------------- | -------------------- | ---------------------------------------------- |
| `components/hero-image-settings.tsx`     | `handleFileUpload`   | `saveMutation.mutate({ url: publicUrl })`      |
| `components/open-source-settings.tsx`    | `handleLogoUpload`   | `setProjects((prev) => ...logo: publicUrl...)` |
| `components/meiji-scrapbook-manager.tsx` | `handleUpload`       | `update(index, 'imageUrl', publicUrl)`         |
| `components/meiji-profile-form.tsx`      | `handleAvatarUpload` | `set('avatarUrl', publicUrl)`                  |

These handlers previously ignored a failed PUT. The hook now throws, and each handler's existing `catch` shows its `Upload failed` toast.

- [ ] **Step 5: Migrate both call sites in `components/meiji-media-manager.tsx`**

Add the `useUploadFile` import once. The file has two components that each declare `getPresignedUrl`; in both, replace the declaration with `const uploadFile = useUploadFile()` and replace the presign-and-PUT block (identical to the one in Step 4) with `const publicUrl = await uploadFile(file)`.

- First component, `handleUpload`: the following `setPending({ url: publicUrl, type: ... })` stays unchanged.
- Edit dialog component, `handleReplace`: the following `setUrl(publicUrl)` stays unchanged.

Videos return `needsProcessing: false` from the server, so they skip `processImage` automatically.

- [ ] **Step 6: Verify nothing still presigns by hand**

Run: `grep -rn "getPresignedUrl" components app | grep -v use-upload-file`
Expected: no output.

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: both succeed. If oxlint reports an unused import in any of the seven files, delete that import.

- [ ] **Step 7: Commit**

```bash
pnpm format
git add lib/hooks/use-upload-file.ts components/blog-editor.tsx components/blog-image-upload.tsx components/hero-image-settings.tsx components/open-source-settings.tsx components/meiji-scrapbook-manager.tsx components/meiji-profile-form.tsx components/meiji-media-manager.tsx
git commit -m "refactor(upload): route every uploader through useUploadFile"
```

---

### Task 5: Backfill script

**Files:**

- Modify: `package.json` (adds `tsx` dev dependency and the `images:backfill` script)
- Create: `scripts/backfill-image-derivatives.ts`

**Interfaces:**

- Consumes from Task 1: `contentTypeForKey`, `isEligibleKey`, `lqipKey`. From Task 2: `generateDerivatives`. From Task 3: `headObject`, `listAllKeys`, `s3ObjectStore`.
- Produces: `pnpm images:backfill [--dry-run] [--force] [--only <key>]`. Exit code 0 when every key succeeded, 1 otherwise.

The script is orchestration over functions that are already unit-tested. It is verified with `--dry-run` against the real bucket, which only lists and heads objects.

- [ ] **Step 1: Add tsx and the npm script**

Run: `pnpm add -D tsx`

In `package.json`, add this entry to `"scripts"` after `"db:studio"`:

```json
    "images:backfill": "tsx --env-file=.env scripts/backfill-image-derivatives.ts",
```

- [ ] **Step 2: Write the script**

Create `scripts/backfill-image-derivatives.ts`:

```ts
/**
 * Generate AVIF/WebP/LQIP derivatives for images that are already in the bucket.
 * Safe to re-run: keys whose LQIP exists are skipped.
 *
 *   pnpm images:backfill --dry-run           list what would happen, write nothing
 *   pnpm images:backfill                     process everything that is missing
 *   pnpm images:backfill --force             regenerate even when derivatives exist
 *   pnpm images:backfill --only <key>        restrict to a single original
 *
 * Also repairs originals whose Content-Type is wrong (for example
 * application/octet-stream) by copying them onto themselves with new metadata.
 * The bucket is versioned, so that is reversible.
 */
import {
  contentTypeForKey,
  isEligibleKey,
  lqipKey
} from '@/lib/images/derivatives'
import { generateDerivatives } from '@/lib/images/process'
import { headObject, listAllKeys, s3ObjectStore } from '@/lib/images/s3-store'

const CONCURRENCY = 3

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const force = args.includes('--force')
const onlyIndex = args.indexOf('--only')
const only = onlyIndex >= 0 ? args[onlyIndex + 1] : undefined

type Outcome = 'processed' | 'skipped'

async function backfillKey(key: string): Promise<Outcome> {
  const original = await headObject(key)
  if (!original) throw new Error('original not found')

  const expectedType = contentTypeForKey(key)
  const needsTypeFix = original.contentType !== expectedType
  const needsDerivatives = force || (await headObject(lqipKey(key))) === null

  if (!needsDerivatives && !needsTypeFix) return 'skipped'

  const actions = [
    needsDerivatives ? 'derivatives' : null,
    needsTypeFix
      ? `content-type ${original.contentType} -> ${expectedType}`
      : null
  ].filter(Boolean)
  console.log(`${dryRun ? '[dry-run] ' : ''}${key}: ${actions.join(', ')}`)
  if (dryRun) return 'processed'

  if (needsDerivatives) {
    const buffer = await s3ObjectStore.get(key)
    await generateDerivatives(s3ObjectStore, key, buffer)
  }
  if (needsTypeFix) {
    await s3ObjectStore.copy(key, key, expectedType)
  }
  return 'processed'
}

async function main() {
  const keys = only
    ? [only]
    : (await listAllKeys()).filter(isEligibleKey).sort()
  if (only && !isEligibleKey(only)) {
    throw new Error(`Not an eligible original: ${only}`)
  }
  console.log(`${keys.length} eligible original(s)`)

  const counts = { processed: 0, skipped: 0 }
  const failures: { key: string; message: string }[] = []
  let next = 0

  async function worker() {
    while (next < keys.length) {
      const key = keys[next++]
      try {
        counts[await backfillKey(key)]++
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        failures.push({ key, message })
        console.error(`FAILED ${key}: ${message}`)
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  console.log(
    `\n${dryRun ? 'Would process' : 'Processed'}: ${counts.processed}, skipped: ${counts.skipped}, failed: ${failures.length}`
  )
  for (const failure of failures) {
    console.log(`  ${failure.key}: ${failure.message}`)
  }
  if (failures.length > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
```

- [ ] **Step 3: Verify with a dry run**

Run: `pnpm images:backfill --dry-run`
Expected: a first line `N eligible original(s)`, one `[dry-run] <key>: derivatives` line per image (with an extra `content-type application/octet-stream -> image/jpeg` for mis-typed originals such as `ng9bwfv1-1728444113930.jpeg`), and a summary ending in `failed: 0`. Nothing is written to S3.

- [ ] **Step 4: Verify the guard**

Run: `pnpm images:backfill --dry-run --only _derived/x.jpeg/w480.avif; echo "exit=$?"`
Expected: an error containing `Not an eligible original` and `exit=1`.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add package.json pnpm-lock.yaml scripts/backfill-image-derivatives.ts
git commit -m "feat(images): add re-runnable backfill for existing images"
```

---

### Task 6: `Picture` component and blur-up `LazyLoadImage`

**Files:**

- Create: `components/picture.tsx`
- Modify: `components/lazy-load-image.tsx` (whole file shown below)
- Test: `__tests__/components/picture.test.tsx`

**Interfaces:**

- Consumes from Task 1: `buildSources`.
- Produces:
  - `Picture` from `@/components/picture`. Props: every `<img>` prop (including `ref`, `onLoad`, `onError`, `className`, `width`, `height`) except `srcSet`, `loading`, `decoding`, `fetchPriority`; plus `src: string`, `alt: string`, `sizes?: string` (default `'100vw'`), `priority?: boolean`, `fill?: boolean`, `disableDerivatives?: boolean`. It has no `'use client'` directive, so server components can render it as long as they pass no function props.
  - `LazyLoadImage` keeps its existing props and gains `sizes?: string` (default `'100vw'`). It always fills its wrapper; `fill`, `width` and `height` are accepted but no longer change layout.

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/picture.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Picture } from '@/components/picture'

const ORIGIN = 'https://static.yancey.app'
const UUID = '3f2b8c1e-9d4a-4f6b-8a21-5c7e9b0d1f23'
const NEW_URL = `${ORIGIN}/${UUID}_1200x800.jpeg`

describe('Picture', () => {
  it('renders AVIF then WebP sources and an <img> with intrinsic size', () => {
    const html = renderToStaticMarkup(
      <Picture
        src={NEW_URL}
        alt="cover"
        sizes="(min-width: 896px) 896px, 100vw"
      />
    )

    expect(html).toContain('<picture')
    expect(html).toContain('type="image/avif"')
    expect(html).toContain('type="image/webp"')
    expect(html.indexOf('image/avif')).toBeLessThan(html.indexOf('image/webp'))
    expect(html).toContain(
      `${ORIGIN}/_derived/${UUID}_1200x800.jpeg/w480.avif 480w`
    )
    expect(html).toContain(
      `${ORIGIN}/_derived/${UUID}_1200x800.jpeg/w1200.webp 1200w`
    )
    expect(html).toContain('sizes="(min-width: 896px) 896px, 100vw"')
    expect(html).toContain(`src="${NEW_URL}"`)
    expect(html).toContain('alt="cover"')
    expect(html).toContain('width="1200"')
    expect(html).toContain('height="800"')
    expect(html).toContain('loading="lazy"')
    expect(html).toContain('decoding="async"')
    expect(html.toLowerCase()).not.toContain('fetchpriority')
  })

  it('omits width and height for legacy URLs', () => {
    const html = renderToStaticMarkup(
      <Picture src={`${ORIGIN}/old.jpeg`} alt="" />
    )
    expect(html).toContain('w2400.avif 2400w')
    expect(html).not.toContain('width=')
    expect(html).not.toContain('height=')
  })

  it.each([
    ['an external URL', 'https://lh3.googleusercontent.com/a/photo.jpeg'],
    ['a GIF', `${ORIGIN}/anim.gif`]
  ])('renders a plain <img> for %s', (_label, src) => {
    const html = renderToStaticMarkup(<Picture src={src} alt="x" />)
    expect(html).not.toContain('<source')
    expect(html).toContain(`src="${src}"`)
  })

  it('loads priority images eagerly with high fetch priority', () => {
    const html = renderToStaticMarkup(<Picture src={NEW_URL} alt="" priority />)
    expect(html).toContain('loading="eager"')
    // React's server renderer keeps the camelCase attribute name; HTML
    // attribute names are case-insensitive.
    expect(html.toLowerCase()).toContain('fetchpriority="high"')
  })

  it('fills its positioned parent and drops intrinsic size when fill is set', () => {
    const html = renderToStaticMarkup(
      <Picture src={NEW_URL} alt="" fill className="object-cover" />
    )
    expect(html).toContain('absolute inset-0 h-full w-full object-cover')
    expect(html).not.toContain('width="1200"')
  })

  it('lets explicit width and height win over the URL', () => {
    const html = renderToStaticMarkup(
      <Picture src={NEW_URL} alt="" width={192} height={192} />
    )
    expect(html).toContain('width="192"')
    expect(html).toContain('height="192"')
  })

  it('renders no sources when derivatives are disabled', () => {
    const html = renderToStaticMarkup(
      <Picture src={NEW_URL} alt="" disableDerivatives />
    )
    expect(html).not.toContain('<source')
    expect(html).toContain('width="1200"')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run __tests__/components/picture.test.tsx`
Expected: FAIL. The error mentions that `@/components/picture` cannot be resolved.

- [ ] **Step 3: Write `Picture`**

Create `components/picture.tsx`:

```tsx
import type { ComponentProps } from 'react'

import { buildSources } from '@/lib/images/derivatives'
import { cn } from '@/lib/utils'

export interface PictureProps extends Omit<
  ComponentProps<'img'>,
  'src' | 'alt' | 'srcSet' | 'loading' | 'decoding' | 'fetchPriority'
> {
  src: string
  alt: string
  /** How wide the image renders, in `sizes` syntax. Drives the srcset choice. */
  sizes?: string
  /** Above-the-fold image: eager load with high fetch priority. */
  priority?: boolean
  /** Absolutely fill the nearest positioned ancestor. */
  fill?: boolean
  /** Skip the AVIF/WebP sources; used as the fallback after a load error. */
  disableDerivatives?: boolean
}

/**
 * `<picture>` with AVIF and WebP width tiers for first-party images, falling
 * back to the untouched original. Anything else (external hosts, GIF, SVG)
 * renders as a plain `<img>`. No 'use client': usable from server components.
 */
export function Picture({
  src,
  alt,
  sizes = '100vw',
  priority = false,
  fill = false,
  disableDerivatives = false,
  className,
  width,
  height,
  ...rest
}: PictureProps) {
  const derived = buildSources(src)

  return (
    // display: contents keeps the <img> laid out as if it were a direct child.
    <picture className="contents">
      {derived && !disableDerivatives && (
        <>
          <source type="image/avif" srcSet={derived.avifSrcSet} sizes={sizes} />
          <source type="image/webp" srcSet={derived.webpSrcSet} sizes={sizes} />
        </>
      )}
      <img
        {...rest}
        src={src}
        alt={alt}
        width={fill ? undefined : (width ?? derived?.width)}
        height={fill ? undefined : (height ?? derived?.height)}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : undefined}
        className={
          cn(fill && 'absolute inset-0 h-full w-full', className) || undefined
        }
      />
    </picture>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run __tests__/components/picture.test.tsx`
Expected: PASS.

- [ ] **Step 5: Rewrite `LazyLoadImage`**

Replace the whole of `components/lazy-load-image.tsx` with:

```tsx
'use client'

import { ImageOffIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Picture } from '@/components/picture'
import { buildSources } from '@/lib/images/derivatives'
import { cn } from '@/lib/utils'

interface LazyLoadImageProps {
  src: string
  alt: string
  /**
   * Applied to the layer that holds both the placeholder and the image, so
   * hover transforms move them together and never clobber the opacity fade.
   */
  className?: string
  skeletonClassName?: string
  /** Accepted for compatibility. The image always fills its wrapper. */
  width?: number
  /** Accepted for compatibility. The image always fills its wrapper. */
  height?: number
  /** Accepted for compatibility. The image always fills its wrapper. */
  fill?: boolean
  priority?: boolean
  /** How wide the image renders, in `sizes` syntax. */
  sizes?: string
}

/**
 * Cover-fit image that fills its (sized, positioned) parent.
 *
 * First-party images blur up: a 24px LQIP is shown blurred until the real
 * image has loaded, then the two cross-fade. Other images keep the pulsing
 * skeleton. If a derivative fails to load, the original is tried once before
 * the error state is shown.
 */
export function LazyLoadImage({
  src,
  alt,
  className,
  skeletonClassName,
  priority = false,
  sizes = '100vw'
}: LazyLoadImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [useOriginal, setUseOriginal] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const lqipUrl = buildSources(src)?.lqipUrl

  const handleError = () => {
    if (lqipUrl && !useOriginal) {
      setUseOriginal(true)
      return
    }
    setHasError(true)
    setIsLoaded(true)
  }

  // Both outcomes can happen before hydration attaches onLoad/onError: a cached
  // image finishes instantly, and a missing derivative can 404 just as fast.
  useEffect(() => {
    const img = imgRef.current
    if (!img?.complete) return
    if (img.naturalWidth > 0) setIsLoaded(true)
    // Only on the first pass: once we are retrying with the original, the
    // listeners are attached and onError reports a second failure itself.
    else if (!useOriginal) handleError()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useOriginal])

  return (
    <div className="relative h-full w-full overflow-hidden">
      {!hasError && (
        <div className={cn('absolute inset-0', className)}>
          {/* Blurred LQIP for first-party images */}
          {lqipUrl && (
            <img
              src={lqipUrl}
              alt=""
              aria-hidden="true"
              loading={priority ? 'eager' : 'lazy'}
              className={cn(
                'absolute inset-0 h-full w-full scale-110 object-cover blur-xl transition-opacity duration-500 motion-reduce:transition-none',
                isLoaded ? 'opacity-0' : 'opacity-100'
              )}
            />
          )}

          {/* Skeleton for everything else */}
          {!lqipUrl && !isLoaded && (
            <div
              className={cn(
                'bg-muted absolute inset-0 animate-pulse',
                skeletonClassName
              )}
            />
          )}

          <Picture
            ref={imgRef}
            src={src}
            alt={alt}
            sizes={sizes}
            fill
            priority={priority}
            disableDerivatives={useOriginal}
            onLoad={() => setIsLoaded(true)}
            onError={handleError}
            className={cn(
              'object-cover transition-opacity duration-500 motion-reduce:transition-none',
              // Priority images are LCP candidates: paint them as soon as
              // bytes arrive instead of waiting for JavaScript to reveal them.
              priority || isLoaded ? 'opacity-100' : 'opacity-0'
            )}
          />
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="bg-muted absolute inset-0 flex items-center justify-center">
          <ImageOffIcon className="text-muted-foreground h-12 w-12" />
        </div>
      )}
    </div>
  )
}
```

Every existing caller already wraps `LazyLoadImage` in a sized, positioned box (`aspect-video`, `aspect-4/5`, `aspect-square`, `h-[55vh]`, or `absolute inset-0`), so always filling is safe. The one visible change: covers that are not 16:9 are now centre-cropped instead of top-aligned.

- [ ] **Step 6: Verify**

Run: `pnpm vitest run && pnpm exec tsc --noEmit && pnpm lint`
Expected: all succeed.

- [ ] **Step 7: Commit**

```bash
pnpm format
git add components/picture.tsx components/lazy-load-image.tsx __tests__/components/picture.test.tsx
git commit -m "feat(images): add Picture component and blur-up LazyLoadImage"
```

---

### Task 7: Post body images

**Files:**

- Create: `lib/images/transform-html.ts`
- Create: `components/blog-content-images.tsx`
- Modify: `app/globals.css` (inside the `.blog-content` block, after the `img:hover` rule)
- Modify: `app/(frontend)/post/[id]/page.tsx`
- Test: `__tests__/lib/images/transform-html.test.ts`

**Interfaces:**

- Consumes from Task 1: `buildSources`.
- Produces:
  - `transformContentImages(html: string): string` and `CONTENT_IMAGE_SIZES` from `@/lib/images/transform-html`
  - `BlogContentImages({ containerId }: { containerId: string })` from `@/components/blog-content-images`
  - Markup contract between the transform, the CSS and the client component: wrapper `span.img-blur` with inline `--lqip` (and `aspect-ratio` when known) containing `picture > source*2 + img`; the client component toggles `data-pending` and `data-loaded` on the wrapper.

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/images/transform-html.test.ts`:

```ts
import * as cheerio from 'cheerio'
import { describe, expect, it } from 'vitest'

import {
  CONTENT_IMAGE_SIZES,
  transformContentImages
} from '@/lib/images/transform-html'

const ORIGIN = 'https://static.yancey.app'
const UUID = '3f2b8c1e-9d4a-4f6b-8a21-5c7e9b0d1f23'
const NEW_URL = `${ORIGIN}/${UUID}_1200x800.jpeg`
const DERIVED = `${ORIGIN}/_derived/${UUID}_1200x800.jpeg`

const parse = (html: string) => cheerio.load(html, null, false)

describe('transformContentImages', () => {
  it('wraps a bare image in blur-up picture markup', () => {
    const out = transformContentImages(
      `<p>before</p><img src="${NEW_URL}" alt="a cat" width="512" data-url="${NEW_URL}" data-preview-width="512"><p>after</p>`
    )
    const $ = parse(out)

    const $wrapper = $('span.img-blur')
    expect($wrapper).toHaveLength(1)
    expect($wrapper.attr('style')).toBe(
      `--lqip:url('${DERIVED}/lqip.webp');aspect-ratio:1200/800`
    )
    expect($wrapper.prev().text()).toBe('before')
    expect($wrapper.next().text()).toBe('after')

    const $sources = $wrapper.find('> picture > source')
    expect($sources).toHaveLength(2)
    expect($sources.eq(0).attr('type')).toBe('image/avif')
    expect($sources.eq(0).attr('srcset')).toBe(
      `${DERIVED}/w480.avif 480w, ${DERIVED}/w960.avif 960w, ${DERIVED}/w1200.avif 1200w`
    )
    expect($sources.eq(0).attr('sizes')).toBe(CONTENT_IMAGE_SIZES)
    expect($sources.eq(1).attr('type')).toBe('image/webp')
    expect($sources.eq(1).attr('sizes')).toBe(CONTENT_IMAGE_SIZES)

    const $img = $wrapper.find('> picture > img')
    expect($img).toHaveLength(1)
    expect($img.attr('src')).toBe(NEW_URL)
    expect($img.attr('alt')).toBe('a cat')
    expect($img.attr('width')).toBe('1200')
    expect($img.attr('height')).toBe('800')
    expect($img.attr('loading')).toBe('lazy')
    expect($img.attr('decoding')).toBe('async')
    expect($img.attr('data-preview-width')).toBe('512')
  })

  it('keeps <figure> and <figcaption> around a wrapped image', () => {
    const out = transformContentImages(
      `<figure data-caption="hi"><img src="${NEW_URL}" alt="x" width="512"><figcaption>hi</figcaption></figure>`
    )
    const $ = parse(out)
    expect($('figure > span.img-blur > picture > img')).toHaveLength(1)
    expect($('figure > figcaption').text()).toBe('hi')
    expect($('figure > span.img-blur').next().is('figcaption')).toBe(true)
  })

  it('gives legacy images sources but no intrinsic size', () => {
    const out = transformContentImages(
      `<img src="${ORIGIN}/old.jpeg" alt="" width="512">`
    )
    const $ = parse(out)
    expect($('span.img-blur').attr('style')).toBe(
      `--lqip:url('${ORIGIN}/_derived/old.jpeg/lqip.webp')`
    )
    expect($('source').eq(1).attr('srcset')).toContain('w2400.webp 2400w')
    expect($('img').attr('width')).toBe('512')
    expect($('img').attr('height')).toBeUndefined()
  })

  it('returns external images, GIFs and image-free HTML untouched', () => {
    const external = '<img src="https://example.com/a.jpeg" alt="">'
    const gif = `<img src="${ORIGIN}/anim.gif" alt="">`
    const text = '<p>no images here</p>'
    expect(transformContentImages(external)).toBe(external)
    expect(transformContentImages(gif)).toBe(gif)
    expect(transformContentImages(text)).toBe(text)
  })

  it('is idempotent', () => {
    const once = transformContentImages(`<img src="${NEW_URL}" alt="">`)
    expect(transformContentImages(once)).toBe(once)
  })

  it('leaves a Shiki code block byte-identical', () => {
    // Stored HTML has already been through cheerio once (lib/shiki.ts), so
    // canonicalise the sample the same way before comparing.
    const pre = parse(
      '<pre class="shiki github-dark" style="background-color:#24292e" tabindex="0"><code><span class="line"><span style="color:#F97583">const</span><span style="color:#E1E4E8"> html = </span><span style="color:#9ECBFF">"&lt;div class=\\"a\\"&gt;&amp;nbsp;&lt;/div&gt;"</span></span></code></pre>'
    ).html()

    const out = transformContentImages(
      `<h2 id="t">Title</h2>${pre}<img src="${NEW_URL}" alt="">`
    )
    expect(out).toContain('span class="img-blur"')
    expect(out).toContain(pre)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run __tests__/lib/images/transform-html.test.ts`
Expected: FAIL. The error mentions that `@/lib/images/transform-html` cannot be resolved.

- [ ] **Step 3: Write the transform**

Create `lib/images/transform-html.ts`:

```ts
import * as cheerio from 'cheerio'

import { buildSources } from './derivatives'

/**
 * The article column is `max-w-4xl` (896px) and `.blog-content img` is forced
 * to the full column width, so every body image renders at this size no matter
 * what width BlockNote recorded.
 */
export const CONTENT_IMAGE_SIZES = '(min-width: 896px) 896px, 100vw'

/**
 * Rewrites first-party `<img>` tags in stored post HTML into blur-up
 * `<picture>` markup. Runs at render time only: the stored HTML, Algolia
 * records, the markdown route and version diffs keep the plain `<img>`.
 *
 * Returns the input string itself when nothing qualifies.
 */
export function transformContentImages(html: string): string {
  if (!html.includes('<img')) return html

  // Same load/serialise round trip the stored HTML already went through in
  // lib/shiki.ts, so untouched markup comes back byte-identical.
  const $ = cheerio.load(html, null, false)
  let changed = false

  $('img').each((_, element) => {
    const $img = $(element)
    if ($img.parent().is('picture')) return

    const src = $img.attr('src')
    const sources = src ? buildSources(src) : null
    if (!sources) return
    changed = true

    $img.attr('loading', 'lazy').attr('decoding', 'async')

    const style = [`--lqip:url('${sources.lqipUrl}')`]
    if (sources.width && sources.height) {
      $img.attr('width', String(sources.width))
      $img.attr('height', String(sources.height))
      style.push(`aspect-ratio:${sources.width}/${sources.height}`)
    }

    const $wrapper = $('<span class="img-blur"></span>').attr(
      'style',
      style.join(';')
    )
    const $picture = $('<picture></picture>')
    $picture.append(
      $('<source>').attr({
        type: 'image/avif',
        srcset: sources.avifSrcSet,
        sizes: CONTENT_IMAGE_SIZES
      })
    )
    $picture.append(
      $('<source>').attr({
        type: 'image/webp',
        srcset: sources.webpSrcSet,
        sizes: CONTENT_IMAGE_SIZES
      })
    )

    $img.replaceWith($wrapper)
    $picture.append($img)
    $wrapper.append($picture)
  })

  return changed ? $.html() : html
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run __tests__/lib/images/transform-html.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the client enhancer**

Create `components/blog-content-images.tsx`:

```tsx
'use client'

import { useEffect } from 'react'

/**
 * Progressive enhancement for the images inside server-rendered post HTML
 * (see lib/images/transform-html.ts). Rendered as a sibling of the content
 * container rather than a wrapper, so the article HTML is not serialised a
 * second time into the RSC payload.
 *
 * - Fades each image in over its blurred LQIP once it has loaded.
 * - If an AVIF/WebP derivative fails, drops the <source> elements so the
 *   browser falls back to the original.
 *
 * Without JavaScript the images are simply visible.
 */
export function BlogContentImages({ containerId }: { containerId: string }) {
  useEffect(() => {
    const root = document.getElementById(containerId)
    if (!root) return

    const wrapperOf = (img: HTMLImageElement) =>
      img.closest<HTMLElement>('.img-blur')

    const markLoaded = (img: HTMLImageElement) => {
      const wrapper = wrapperOf(img)
      if (!wrapper) return
      wrapper.removeAttribute('data-pending')
      wrapper.setAttribute('data-loaded', '')
    }

    const fallBack = (img: HTMLImageElement) => {
      const picture = img.parentElement
      const sources =
        picture?.tagName === 'PICTURE'
          ? picture.querySelectorAll('source')
          : null

      if (sources && sources.length > 0) {
        sources.forEach((source) => source.remove())
        const original = img.getAttribute('src')
        if (original) img.src = original
        return
      }
      // The original failed too: reveal the alt text instead of a blank box.
      wrapperOf(img)?.removeAttribute('data-pending')
    }

    const onLoad = (event: Event) => {
      if (event.target instanceof HTMLImageElement) markLoaded(event.target)
    }
    const onError = (event: Event) => {
      if (event.target instanceof HTMLImageElement) fallBack(event.target)
    }

    // load and error do not bubble, so listen in the capture phase.
    root.addEventListener('load', onLoad, true)
    root.addEventListener('error', onError, true)

    // Catch up with whatever happened before hydration.
    root.querySelectorAll<HTMLImageElement>('.img-blur img').forEach((img) => {
      if (!img.complete) {
        wrapperOf(img)?.setAttribute('data-pending', '')
      } else if (img.naturalWidth > 0) {
        markLoaded(img)
      } else {
        fallBack(img)
      }
    })

    return () => {
      root.removeEventListener('load', onLoad, true)
      root.removeEventListener('error', onError, true)
    }
  }, [containerId])

  return null
}
```

- [ ] **Step 6: Add the styles**

In `app/globals.css`, inside the `.blog-content { ... }` block, find:

```css
/* Image hover effect */
img:hover {
  @apply shadow-lg transition-shadow duration-300;
}
```

Insert directly after it:

```css
/* Blur-up wrapper emitted by lib/images/transform-html.ts.
       data-pending / data-loaded are toggled by components/blog-content-images.tsx */
.img-blur {
  @apply relative mx-auto block w-full overflow-hidden rounded-lg shadow-md;

  &::before {
    content: '';
    @apply absolute inset-0 scale-110 bg-cover bg-center blur-xl transition-opacity duration-500;
    background-image: var(--lqip);
  }

  picture {
    @apply block;
  }

  /* The wrapper owns the radius and shadow; overflow-hidden would clip them on the img. */
  img {
    @apply relative block rounded-none shadow-none transition-opacity duration-500;
  }

  &[data-pending] img {
    opacity: 0;
  }

  &[data-loaded]::before {
    opacity: 0;
  }

  &:hover {
    @apply shadow-lg transition-shadow duration-300;
  }
}

@media (prefers-reduced-motion: reduce) {
  .img-blur::before,
  .img-blur img {
    transition: none;
  }
}
```

- [ ] **Step 7: Wire up the post page**

In `app/(frontend)/post/[id]/page.tsx`, add two imports next to the other `@/` imports:

```ts
import { BlogContentImages } from '@/components/blog-content-images'
import { transformContentImages } from '@/lib/images/transform-html'
```

Replace

```ts
const content = blog.highlightedContent || blog.content
// Extract the outline on the server so the TOC renders during SSR.
const tocItems = extractToc(content)
```

with

```ts
const storedContent = blog.highlightedContent || blog.content
// Extract the outline on the server so the TOC renders during SSR.
const tocItems = extractToc(storedContent)
// Render-time only: stored HTML keeps plain <img> tags.
const content = transformContentImages(storedContent)
```

Replace

```tsx
<div className="blog-content" dangerouslySetInnerHTML={{ __html: content }} />
```

with

```tsx
            <div
              id="blog-content"
              className="blog-content"
              dangerouslySetInnerHTML={{ __html: content }}
            />
            <BlogContentImages containerId="blog-content" />
```

- [ ] **Step 8: Verify**

Run: `pnpm vitest run && pnpm exec tsc --noEmit && pnpm lint`
Expected: all succeed.

- [ ] **Step 9: Commit**

```bash
pnpm format
git add lib/images/transform-html.ts components/blog-content-images.tsx app/globals.css "app/(frontend)/post/[id]/page.tsx" __tests__/lib/images/transform-html.test.ts
git commit -m "feat(post): serve body images as blur-up AVIF/WebP pictures"
```

---

### Task 8: Remaining public image surfaces

**Files:**

- Modify: `components/parallax-hero.tsx` (whole file shown below)
- Modify: `app/(frontend)/post/[id]/page.tsx` (cover image)
- Modify: `components/home-open-source.tsx`, `components/meiji/meiji-hero.tsx`, `components/meiji/meiji-media-lightbox.tsx`
- Modify (add `sizes`): `app/(frontend)/post/page.tsx`, `components/home-articles.tsx` (two call sites), `components/blog-adjacent-nav.tsx`, `components/meiji/meiji-media-feed.tsx`, `components/meiji/meiji-scrapbook.tsx`

**Interfaces:**

- Consumes from Task 6: `Picture`, `LazyLoadImage` (with the new `sizes` prop).
- Produces: nothing new. Admin components (`hero-image-settings`, `open-source-settings`, `meiji-*-manager`, `blog-image-upload`, `blog-version-diff`) keep `next/image` or plain `<img>` and are not touched. Also not touched: the header logo in `components/frontend-header-client.tsx` (a local `/public` file, not eligible) and the 24px avatar on the login page.

No unit tests here: these are prop and markup changes on components already covered by Task 6's tests, verified by the type checker now and in the browser in Task 10.

- [ ] **Step 1: Home hero**

Replace the whole of `components/parallax-hero.tsx` with:

```tsx
'use client'

import { useEffect, useRef } from 'react'

import { LazyLoadImage } from '@/components/lazy-load-image'

interface ParallaxHeroProps {
  imageUrl: string
  children: React.ReactNode
}

export function ParallaxHero({ imageUrl, children }: ParallaxHeroProps) {
  const bgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = bgRef.current
    if (!el) return

    const handleScroll = () => {
      const scrollY = window.scrollY
      el.style.transform = `translateY(${scrollY * 0.4}px)`
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <div className="absolute inset-0 -z-10">
        {/* An <img> instead of a CSS background so the hero gets AVIF/WebP
            tiers and the blur-up placeholder. It is the LCP element. */}
        <div
          ref={bgRef}
          className="absolute inset-0 -top-[20%] h-[120%] w-full will-change-transform"
        >
          <LazyLoadImage src={imageUrl} alt="" priority sizes="100vw" />
        </div>
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {children}
    </section>
  )
}
```

- [ ] **Step 2: Post cover**

In `app/(frontend)/post/[id]/page.tsx`, delete `import Image from 'next/image'` and add:

```ts
import { LazyLoadImage } from '@/components/lazy-load-image'
```

Replace

```tsx
<Image
  src={blog.coverImage}
  alt={blog.title}
  fill
  className="object-cover"
  priority
/>
```

with

```tsx
<LazyLoadImage
  src={blog.coverImage}
  alt={blog.title}
  priority
  sizes="(min-width: 896px) 896px, 100vw"
/>
```

Leave `generateMetadata` alone: `og:image` and the Twitter card keep the original URL.

- [ ] **Step 3: Open-source logos**

In `components/home-open-source.tsx`, replace `import Image from 'next/image'` with `import { Picture } from '@/components/picture'`, then replace

```tsx
<Image
  src={project.logo}
  alt={project.name}
  fill
  className="object-cover"
  unoptimized
/>
```

with

```tsx
<Picture
  src={project.logo}
  alt={project.name}
  fill
  sizes="40px"
  className="object-cover"
/>
```

- [ ] **Step 4: Meiji avatar**

In `components/meiji/meiji-hero.tsx`, replace `import Image from 'next/image'` with `import { Picture } from '@/components/picture'`, then replace

```tsx
<Image
  src={profile.avatarUrl}
  alt={profile.name}
  width={192}
  height={192}
  className="h-full w-full object-cover"
/>
```

with

```tsx
<Picture
  src={profile.avatarUrl}
  alt={profile.name}
  width={192}
  height={192}
  sizes="192px"
  className="h-full w-full object-cover"
/>
```

- [ ] **Step 5: Meiji lightbox**

In `components/meiji/meiji-media-lightbox.tsx`, add `import { Picture } from '@/components/picture'`, then replace

```tsx
// eslint-disable-next-line @next/next/no-img-element
<img
  src={item.url}
  alt={item.caption ?? 'Meiji'}
  className="max-h-[60vh] w-auto max-w-full rounded-[20px] object-contain"
/>
```

with

```tsx
<Picture
  src={item.url}
  alt={item.caption ?? 'Meiji'}
  sizes="100vw"
  className="max-h-[60vh] w-auto max-w-full rounded-[20px] object-contain"
/>
```

- [ ] **Step 6: Tell every `LazyLoadImage` caller how wide it renders**

Add one `sizes` prop to each call site. Keep all existing props.

| File                                    | Call site                                      | Prop to add                                                        |
| --------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------ |
| `app/(frontend)/post/page.tsx`          | article card cover                             | `sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"` |
| `components/home-articles.tsx`          | `FeaturedPost` cover (the one with `priority`) | `sizes="(min-width: 1536px) 1536px, 100vw"`                        |
| `components/home-articles.tsx`          | grid card cover                                | `sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"` |
| `components/blog-adjacent-nav.tsx`      | previous/next thumbnail                        | `sizes="112px"`                                                    |
| `components/meiji/meiji-media-feed.tsx` | feed photo                                     | `sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"` |
| `components/meiji/meiji-scrapbook.tsx`  | polaroid photo                                 | `sizes="144px"`                                                    |

- [ ] **Step 7: Verify**

Run: `grep -rn "next/image" app/\(frontend\) components/home-open-source.tsx components/meiji/ components/lazy-load-image.tsx components/parallax-hero.tsx`
Expected: no output.

Run: `grep -rn "<LazyLoadImage" -A8 app components | grep -c "sizes="`
Expected: `8` (six call sites from Step 6, plus the hero and the post cover).

Run: `pnpm vitest run && pnpm exec tsc --noEmit && pnpm lint`
Expected: all succeed.

- [ ] **Step 8: Commit**

```bash
pnpm format
git add components/parallax-hero.tsx "app/(frontend)/post/[id]/page.tsx" "app/(frontend)/post/page.tsx" components/home-open-source.tsx components/home-articles.tsx components/blog-adjacent-nav.tsx components/meiji/meiji-hero.tsx components/meiji/meiji-media-lightbox.tsx components/meiji/meiji-media-feed.tsx components/meiji/meiji-scrapbook.tsx
git commit -m "feat(frontend): use AVIF/WebP pictures on every public image surface"
```

---

### Task 9: Real-bucket smoke test and backfill

**Files:**

- Create then delete: `.smoke-process-image.mts` (temporary, never committed)

**Interfaces:**

- Consumes: `processUploadedImage`, `s3ObjectStore`, `headObject`, `pnpm images:backfill`.
- Produces: derivatives under `_derived/` for every existing original in the production bucket.

This task writes to the production bucket. Everything it writes is additive (`_derived/…`) except the Content-Type repair, which rewrites metadata on mis-typed originals; the bucket is versioned, so that is reversible. The repository owner has authorised running it.

- [ ] **Step 1: Smoke-test the upload path against S3 and CloudFront**

Create `.smoke-process-image.mts` in the project root:

```ts
import { randomUUID } from 'node:crypto'

import sharp from 'sharp'

import { derivedKey, lqipKey } from '@/lib/images/derivatives'
import { processUploadedImage } from '@/lib/images/process'
import { headObject, s3ObjectStore } from '@/lib/images/s3-store'

const tmpKey = `tmp/${randomUUID()}.jpeg`
const fixture = await sharp({
  create: { width: 1200, height: 800, channels: 3, background: '#c85028' }
})
  .jpeg()
  .toBuffer()

await s3ObjectStore.put(tmpKey, fixture, 'image/jpeg')
const result = await processUploadedImage(s3ObjectStore, tmpKey)
console.log('processed:', result)

const written = [
  result.key,
  derivedKey(result.key, 480, 'avif'),
  derivedKey(result.key, 960, 'webp'),
  derivedKey(result.key, 1200, 'avif'),
  lqipKey(result.key)
]
for (const key of written) {
  console.log(key, await headObject(key))
}
console.log('tmp still exists:', (await headObject(tmpKey)) !== null)

const response = await fetch(
  `https://static.yancey.app/${derivedKey(result.key, 480, 'avif')}`
)
console.log(
  'via CloudFront:',
  response.status,
  response.headers.get('content-type'),
  response.headers.get('cache-control')
)

// Clean up everything this script created.
for (const tier of [480, 960, 1200]) {
  await s3ObjectStore.delete(derivedKey(result.key, tier, 'avif'))
  await s3ObjectStore.delete(derivedKey(result.key, tier, 'webp'))
}
await s3ObjectStore.delete(lqipKey(result.key))
await s3ObjectStore.delete(result.key)
console.log('cleaned up')
```

Run: `pnpm exec tsx --env-file=.env .smoke-process-image.mts; rm -f .smoke-process-image.mts`

Expected:

- `processed:` shows a key ending in `_1200x800.jpeg` and a `https://static.yancey.app/…_1200x800.jpeg` URL.
- Every listed key prints a non-null object; the original has `contentType: 'image/jpeg'`, AVIF keys `image/avif`, WebP and LQIP keys `image/webp`.
- `tmp still exists: false`.
- `via CloudFront: 200 image/avif public, max-age=31536000, immutable`.
- `cleaned up`, and `git status` shows no `.smoke-process-image.mts`.

If any line differs, stop and fix before backfilling.

- [ ] **Step 2: Dry-run the backfill and review the list**

Run: `pnpm images:backfill --dry-run | tee /tmp/backfill-dry-run.txt | tail -20`
Expected: a count of eligible originals and `failed: 0`. Skim the list for keys that should not be there (anything under an unexpected prefix). Share the count with the repository owner.

- [ ] **Step 3: Backfill one image and check it end to end**

Run: `pnpm images:backfill --only ng9bwfv1-1728444113930.jpeg`
Expected: one line ending in `derivatives, content-type application/octet-stream -> image/jpeg` and `Processed: 1, skipped: 0, failed: 0`.

Run:

```bash
for f in w480.avif w2400.webp lqip.webp; do
  curl -sI "https://static.yancey.app/_derived/ng9bwfv1-1728444113930.jpeg/$f" | grep -iE '^HTTP|content-type|content-length|cache-control'
done
```

Expected: three `200` responses with `image/avif`, `image/webp`, `image/webp`; the LQIP `content-length` is under 2000; the `w2400.webp` is far smaller than the 1,200,377-byte original.

- [ ] **Step 4: Run the full backfill**

Run: `pnpm images:backfill 2>&1 | tee /tmp/backfill-run.txt | tail -20`
Expected: `failed: 0`. If any key failed, re-run the same command; finished keys are skipped. Investigate a key that fails twice with `pnpm images:backfill --only <key>`.

- [ ] **Step 5: Confirm it is idempotent**

Run: `pnpm images:backfill --dry-run | tail -3`
Expected: `Would process: 0`, every key skipped, `failed: 0`.

Nothing to commit in this task.

---

### Task 10: Documentation and end-to-end verification

**Files:**

- Modify: `CLAUDE.md` (the `### Image Upload (AWS S3)` section)

**Interfaces:**

- Consumes: everything above.
- Produces: a branch that is ready to merge.

- [ ] **Step 1: Document the pipeline**

In `CLAUDE.md`, replace the body of the `### Image Upload (AWS S3)` section (the three bullets under the heading) with:

```markdown
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
```

- [ ] **Step 2: Full automated verification**

Run: `pnpm format:check && pnpm lint && pnpm test && pnpm build`
Expected: all four succeed. The test summary shows the four new test files passing alongside the original eight.

- [ ] **Step 3: Browser check of the public pages**

Run `pnpm dev`, open `http://localhost:3000`, and check with DevTools (Network tab, "Img" filter, cache disabled, throttled to "Fast 4G" so the blur-up is visible):

- Home: the hero shows a blurred placeholder, then the sharp image. Its request is `…/_derived/…/w{N}.avif` with a width suited to the viewport, and no request goes to the 1.2 MB original. Article cards blur up as they scroll into view.
- `/post`: card covers request `w480` or `w960` AVIF files.
- Any post with body images: each body image is a `<picture>`; images uploaded before this change (legacy names) load AVIF without a placeholder box, which is expected.
- Meiji page: feed photos blur up; the lightbox loads a larger AVIF tier; videos are unchanged.
- In DevTools, block the request URL pattern `*_derived*w*.avif` and `*_derived*w*.webp` and reload a post: every image still appears, served from the original URL.
- Toggle "Emulate CSS prefers-reduced-motion": images appear without fading.
- The console shows no hydration warnings.

- [ ] **Step 4: Upload check (needs an admin login, so the repository owner does this)**

In `/admin/blog-management`, create a draft, drop a JPEG photo into the editor and wait for it to appear. Confirm in the editor's HTML or the saved post that the image URL ends in `_{width}x{height}.jpeg`. Publish the draft, open it on the public site, and confirm the body image reserves its space before loading and blurs up. Upload a GIF too and confirm it still works and keeps its plain `uuid.gif` URL. Delete the draft afterwards.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: describe the image derivative pipeline"
```

- [ ] **Step 6: After merge and deploy**

Run `pnpm images:backfill` once more from `master`. It picks up images that were uploaded by the old production code between the first backfill and the deploy, and skips everything else.

Optional: add an S3 lifecycle rule that expires objects under `tmp/` after one day. It cleans up temp uploads left behind when `processImage` fails part-way; they are harmless otherwise.

The production deployment must use AWS credentials with the same S3 permissions as the local `.env` (GetObject, PutObject, DeleteObject, ListBucket); confirm this before relying on uploads in production.
