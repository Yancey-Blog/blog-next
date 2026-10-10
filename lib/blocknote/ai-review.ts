import type { MarkType, Node as PMNode, Schema } from '@tiptap/pm/model'
import type { EditorState, Transaction } from '@tiptap/pm/state'

/**
 * Per-change review of BlockNote AI suggestions.
 *
 * `@blocknote/xl-ai` marks AI edits with `insertion` / `deletion` /
 * `modification` marks, but every mark carries the same (null) id, so its own
 * accept/reject can only resolve the whole response at once. Here the marked
 * ranges are split into changes by position instead, so each one can be
 * accepted or rejected on its own.
 */

export interface AIChange {
  /** Document range holding every suggestion mark of this change. */
  from: number
  to: number
  /** Text before / after the change, for the review preview. */
  before: string
  after: string
  /** Unchanged text around an inline change (empty for block changes). */
  contextBefore: string
  contextAfter: string
  /** Set when a block changed type or attributes, e.g. "paragraph → heading". */
  note?: string
}

/** Edits separated by at most this many unchanged characters form one change. */
const MERGE_GAP = 2
const CONTEXT_CHARS = 20
/** Placeholder text xl-ai inserts into otherwise-empty inserted content. */
const ZERO_WIDTH_SPACE = '​'

interface SuggestionMarks {
  insertion: MarkType
  deletion: MarkType
  modification: MarkType
}

function getSuggestionMarks(schema: Schema): SuggestionMarks | null {
  const { insertion, deletion, modification } = schema.marks
  if (!insertion || !deletion || !modification) return null
  return { insertion, deletion, modification }
}

function hasSuggestion(node: PMNode, marks: SuggestionMarks): boolean {
  return node.marks.some(
    (mark) =>
      mark.type === marks.insertion ||
      mark.type === marks.deletion ||
      mark.type === marks.modification
  )
}

function inlineText(node: PMNode): string {
  if (node.isText) return node.text!.replaceAll(ZERO_WIDTH_SPACE, '')
  return node.isLeaf ? ' ' : node.textContent
}

/** Text of `node` with the content carrying `dropped` left out. */
function sideText(node: PMNode, dropped: MarkType): string {
  let text = ''
  node.descendants((child) => {
    if (dropped.isInSet(child.marks)) return false
    if (child.isInline) {
      text += inlineText(child)
      return false
    }
    return true
  })
  return text
}

function describeModifications(node: PMNode, marks: SuggestionMarks) {
  const notes = node.marks
    .filter((mark) => mark.type === marks.modification)
    .map((mark) =>
      mark.attrs.type === 'nodeType'
        ? `${mark.attrs.previousValue} → ${mark.attrs.newValue}`
        : `${mark.attrs.attrName}: ${mark.attrs.previousValue} → ${mark.attrs.newValue}`
    )
  return notes.length > 0 ? notes.join(', ') : undefined
}

function blockChange(
  node: PMNode,
  pos: number,
  marks: SuggestionMarks
): AIChange {
  let note: string | undefined
  // The modification mark sits on the block content node (e.g. a paragraph that
  // became a heading), which may be the node itself or a descendant.
  node.descendants((child) => {
    note ??= describeModifications(child, marks)
    return !note
  })
  return {
    from: pos,
    to: pos + node.nodeSize,
    before: marks.insertion.isInSet(node.marks)
      ? ''
      : sideText(node, marks.insertion),
    after: marks.deletion.isInSet(node.marks)
      ? ''
      : sideText(node, marks.deletion),
    contextBefore: '',
    contextAfter: '',
    note: describeModifications(node, marks) ?? note
  }
}

function inlineChanges(
  textblock: PMNode,
  pos: number,
  marks: SuggestionMarks
): AIChange[] {
  const contentStart = pos + 1
  const changes: AIChange[] = []
  let current: AIChange | null = null
  // Unchanged text seen since the end of `current`.
  let gap = ''

  textblock.forEach((child, offset) => {
    const text = inlineText(child)
    const deleted = !!marks.deletion.isInSet(child.marks)
    const inserted = !!marks.insertion.isInSet(child.marks)

    if (!hasSuggestion(child, marks)) {
      if (current) gap += text
      return
    }

    const from = contentStart + offset
    const to = from + child.nodeSize
    if (current && gap.length <= MERGE_GAP) {
      current.before += gap + (inserted ? '' : text)
      current.after += gap + (deleted ? '' : text)
      current.to = to
    } else {
      current = {
        from,
        to,
        before: inserted ? '' : text,
        after: deleted ? '' : text,
        contextBefore: '',
        contextAfter: ''
      }
      changes.push(current)
    }
    gap = ''
  })

  for (const change of changes) {
    change.contextBefore = textblock
      .textBetween(0, change.from - contentStart, undefined, ' ')
      .replaceAll(ZERO_WIDTH_SPACE, '')
      .slice(-CONTEXT_CHARS)
    change.contextAfter = textblock
      .textBetween(
        change.to - contentStart,
        textblock.content.size,
        undefined,
        ' '
      )
      .replaceAll(ZERO_WIDTH_SPACE, '')
      .slice(0, CONTEXT_CHARS)
  }

  return changes
}

/**
 * Splits the AI suggestions in `doc` into reviewable changes, in document
 * order. A block that was inserted, deleted or restyled is one change; edits
 * inside a block's text are one change per run of nearby edits.
 */
export function collectAIChanges(doc: PMNode): AIChange[] {
  const marks = getSuggestionMarks(doc.type.schema)
  if (!marks) return []

  const changes: AIChange[] = []
  doc.descendants((node, pos) => {
    if (node.isBlock && hasSuggestion(node, marks)) {
      changes.push(blockChange(node, pos, marks))
      return false
    }
    if (node.isTextblock) {
      changes.push(...inlineChanges(node, pos, marks))
      return false
    }
    return true
  })
  return changes
}

/**
 * Builds a transaction that accepts or rejects the suggestions inside
 * `change`, leaving every other suggestion in the document untouched.
 *
 * Accepting keeps insertions and deletes deletions; rejecting does the
 * opposite and restores the previous type/attributes of restyled blocks.
 */
export function resolveAIChange(
  state: EditorState,
  change: Pick<AIChange, 'from' | 'to'>,
  accept: boolean
): Transaction {
  const tr = state.tr
  const marks = getSuggestionMarks(state.schema)
  if (!marks) return tr

  const kept = accept ? marks.insertion : marks.deletion
  const dropped = accept ? marks.deletion : marks.insertion
  const removals: Array<{ from: number; to: number; block: boolean }> = []

  // Mark and markup edits keep every node's size, so positions from the
  // original document stay valid until the removals run at the end.
  state.doc.nodesBetween(change.from, change.to, (node, pos) => {
    const end = pos + node.nodeSize
    // Ancestors (and anything only partly inside the change): look inside.
    if (pos < change.from || end > change.to) return true

    if (
      dropped.isInSet(node.marks) ||
      (accept && node.isText && node.text === ZERO_WIDTH_SPACE)
    ) {
      removals.push({ from: pos, to: end, block: node.isBlock })
      return false
    }

    const modifications = node.marks.filter(
      (mark) => mark.type === marks.modification
    )
    if (!kept.isInSet(node.marks) && modifications.length === 0) return true

    if (node.isInline) {
      tr.removeMark(pos, end, kept)
      modifications.forEach((mark) => tr.removeMark(pos, end, mark))
      return true
    }

    let type = node.type
    let attrs = node.attrs
    if (!accept) {
      for (const mark of modifications) {
        if (mark.attrs.type === 'nodeType') {
          type = state.schema.nodes[mark.attrs.previousValue] ?? type
        } else if (mark.attrs.type === 'attr') {
          attrs = { ...attrs, [mark.attrs.attrName]: mark.attrs.previousValue }
        }
      }
    }
    tr.setNodeMarkup(
      pos,
      type,
      attrs,
      node.marks.filter(
        (mark) => mark.type !== kept && mark.type !== marks.modification
      )
    )
    return true
  })

  for (const removal of removals.sort((a, b) => b.from - a.from)) {
    if (removal.block) {
      tr.deleteRange(removal.from, removal.to)
    } else {
      tr.delete(removal.from, removal.to)
    }
  }

  return tr
}
