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
