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
