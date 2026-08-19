// Server-side BlockNote helper. Imported only from server code (the lazy
// dynamic import in `BlogService.createBlog`/`updateBlog`); deliberately NOT
// `import 'server-only'` so it stays usable from any Node context.
import type { Block } from '@blocknote/core'
import { ServerBlockNoteEditor } from '@blocknote/server-util'

import { blogSchema } from './schema'

// ServerBlockNoteEditor is stateless per call; create once and reuse.
const serverEditor = ServerBlockNoteEditor.create({ schema: blogSchema })

/** Render BlockNote blocks to clean semantic HTML for storage/render. */
export async function blocksToContentHtml(blocks: Block[]): Promise<string> {
  return await serverEditor.blocksToHTMLLossy(blocks)
}
