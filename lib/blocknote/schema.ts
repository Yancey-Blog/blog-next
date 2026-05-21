import {
  BlockNoteSchema,
  createHeadingBlockSpec,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs
} from '@blocknote/core'
import { Superscript } from './superscript'

/**
 * Shared BlockNote schema used by BOTH the client editor (useCreateBlockNote)
 * and the server-side converter (ServerBlockNoteEditor). They MUST use the
 * same schema so HTML<->blocks conversion is identical on both sides.
 *
 * Headings are pinned to levels 1-6 because existing posts use h4.
 * A custom `superscript` inline spec restores `<sup>` (used by ~2 posts);
 * `<hr>` needs no custom spec because the native `divider` block handles it.
 */
export const blogSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    heading: createHeadingBlockSpec({ levels: [1, 2, 3, 4, 5, 6] })
  },
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    superscript: Superscript
  },
  styleSpecs: {
    ...defaultStyleSpecs
  }
})

export type BlogSchema = typeof blogSchema
