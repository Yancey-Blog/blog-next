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
