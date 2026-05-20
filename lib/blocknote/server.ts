// NOTE: deliberately NO `import 'server-only'` here. This module is imported
// by the standalone `scripts/migrate-to-blocknote.ts` (run via vite-node),
// where `server-only`'s default export throws. These functions are only ever
// imported from server code anyway.
import type { Block } from '@blocknote/core'
import { ServerBlockNoteEditor } from '@blocknote/server-util'
import * as cheerio from 'cheerio'
import { blogSchema } from './schema'

// ServerBlockNoteEditor is stateless per call; create once and reuse.
const serverEditor = ServerBlockNoteEditor.create({ schema: blogSchema })

/**
 * BlockNote's default schema has no inline image — only a block-level image.
 * Legacy TinyMCE content frequently puts an `<img>` *inside* a paragraph
 * mixed with text (e.g. `<p>text<br><img><br>text</p>`), and BlockNote's
 * parser silently drops those inline images. This lifts every `<img>` that is
 * a direct child of a `<p>` out into a block-level sibling, splitting the
 * paragraph around it so the image is preserved as an image block.
 */
export function promoteBlockImages(html: string): string {
  const $ = cheerio.load(html, null, false)
  let changed = false

  $('p').each((_, p) => {
    const $p = $(p)
    if ($p.children('img').length === 0) return

    const parts: string[] = []
    let buffer: string[] = []
    const flush = () => {
      if (buffer.length === 0) return
      const inner = buffer.join('')
      // Drop segments that are only <br>/whitespace; keep anything with text
      // or a meaningful inline element (links, code, emphasis, sup, ...).
      const textish = inner
        .replace(/<br\s*\/?>(?=\s*$)?/gi, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .trim()
      if (textish.length > 0 || /<(a|code|strong|em|b|i|sup|mark)\b/i.test(inner)) {
        parts.push(`<p>${inner}</p>`)
      }
      buffer = []
    }

    $p.contents().each((__, node) => {
      if (node.type === 'tag' && node.name === 'img') {
        flush()
        parts.push($.html(node))
      } else {
        buffer.push($.html(node))
      }
    })
    flush()

    $p.replaceWith(parts.join(''))
    changed = true
  })

  return changed ? $.html() : html
}

/** Parse a TinyMCE/legacy HTML string into BlockNote blocks. */
export async function htmlToBlocks(html: string): Promise<Block[]> {
  const preprocessed = promoteBlockImages(html)
  return (await serverEditor.tryParseHTMLToBlocks(preprocessed)) as Block[]
}

/** Render BlockNote blocks to clean semantic HTML for storage/render. */
export async function blocksToContentHtml(blocks: Block[]): Promise<string> {
  return await serverEditor.blocksToHTMLLossy(blocks)
}

/** Convenience: legacy HTML -> blocks -> normalized semantic HTML. */
export async function normalizeHtmlViaBlocks(html: string): Promise<{
  blocks: Block[]
  html: string
}> {
  const blocks = await htmlToBlocks(html)
  const normalized = await blocksToContentHtml(blocks)
  return { blocks, html: normalized }
}
