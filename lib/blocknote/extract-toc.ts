import * as cheerio from 'cheerio'

export interface TocHeading {
  /** Heading anchor id (already injected server-side in lib/shiki.ts). */
  id: string
  text: string
  /** Heading level: 2 or 3. */
  depth: number
}

/**
 * Extract the h2/h3 outline from derived blog HTML on the server, so the table
 * of contents can render during SSR instead of being parsed client-side.
 * Ids are already present (added when `highlightedContent` is generated).
 */
export function extractToc(html: string): TocHeading[] {
  const $ = cheerio.load(html, null, false)
  const headings: TocHeading[] = []

  $('h2[id], h3[id]').each((_, el) => {
    const $el = $(el)
    const id = $el.attr('id')
    if (!id) return // skip headings whose slug came out empty
    headings.push({
      id,
      text: $el.text().trim(),
      depth: $el.prop('tagName') === 'H3' ? 3 : 2
    })
  })

  return headings
}
