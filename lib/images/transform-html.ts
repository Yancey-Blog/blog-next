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
