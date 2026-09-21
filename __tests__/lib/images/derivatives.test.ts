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
