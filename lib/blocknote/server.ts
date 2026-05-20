// NOTE: deliberately NO `import 'server-only'` here. This module is imported
// by the standalone `scripts/migrate-to-blocknote.ts` (plain Node via tsx),
// where `server-only`'s default export throws. These functions are only ever
// imported from server code anyway.
import type { Block } from '@blocknote/core'
import { ServerBlockNoteEditor } from '@blocknote/server-util'
import { blogSchema } from './schema'

// ServerBlockNoteEditor is stateless per call; create once and reuse.
const serverEditor = ServerBlockNoteEditor.create({ schema: blogSchema })

/** Parse a TinyMCE/legacy HTML string into BlockNote blocks. */
export async function htmlToBlocks(html: string): Promise<Block[]> {
  return (await serverEditor.tryParseHTMLToBlocks(html)) as Block[]
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
