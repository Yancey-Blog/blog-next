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
