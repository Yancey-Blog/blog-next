import { createInlineContentSpec } from '@blocknote/core'

/**
 * Custom `<sup>` inline content spec (used by ~2 existing posts).
 *
 * Implemented with the non-React core API (`createInlineContentSpec`) so it
 * renders to plain DOM nodes. This matters because the shared schema is also
 * used by `ServerBlockNoteEditor` (server-side / migration script) — a
 * React-based spec triggers uncaught react-dom errors when serialized there.
 * `toExternalHTML` is omitted; BlockNote falls back to `render`, which already
 * produces a `<sup>` element for export.
 *
 * NOTE: `<hr>` is intentionally NOT given a custom spec — BlockNote ships a
 * native `divider` block in `defaultBlockSpecs` that already parses/renders
 * `<hr>`, so registering another would collide.
 */
export const Superscript = createInlineContentSpec(
  {
    type: 'superscript',
    propSchema: {},
    content: 'styled'
  } as const,
  {
    render: () => {
      const sup = document.createElement('sup')
      return { dom: sup, contentDOM: sup }
    },
    parse: (element) => (element.tagName === 'SUP' ? {} : undefined)
  }
)
