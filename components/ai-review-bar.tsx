'use client'

import type { BlockNoteEditor } from '@blocknote/core'
import { ShowSelectionExtension } from '@blocknote/core/extensions'
import { useExtension, useExtensionState } from '@blocknote/react'
import { AIExtension, aiDocumentFormats } from '@blocknote/xl-ai'
import { TextSelection } from '@tiptap/pm/state'
import {
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  RotateCcw,
  Sparkles,
  Square,
  X
} from 'lucide-react'
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'

import {
  collectAIChanges,
  resolveAIChange,
  type AIChange
} from '@/lib/blocknote/ai-review'

import { Button } from './ui/button'
import { Spinner } from './ui/spinner'
import { toast } from './ui/toast'

const POLISH_PROMPT = `Proofread the ENTIRE document as a careful technical editor. The author's style is deliberate: preserve it. Only fix what is actually wrong.

Fix:
1. Typos, wrong characters (错别字) and grammar mistakes.
2. Formatting problems: missing spaces between CJK and Latin text, leftover Markdown syntax, inconsistent heading levels, code identifiers that should be inline code.
3. Wrong or misleading statements: incorrect facts or numbers, misused technical terms, a definition or explanation that describes the wrong thing (e.g. a paragraph meant to define HTTPS that actually defines TCP), claims that contradict the rest of the post, and broken cause-and-effect reasoning. Rewrite as much of the sentence or paragraph as the fix needs, but keep the author's tone, sentence patterns and wording everywhere else.

Do NOT change:
- Anything that is correct, even if you would phrase it differently. Colloquial expressions, humor, sentence rhythm and word choice are the author's voice, not errors.
- Punctuation. Keep every punctuation mark exactly as written, half-width or full-width: posts mix both on purpose (e.g. ", " in one paragraph, "，" in another). Never convert between "," and "，", "." and "。", ":" and "：", "()" and "（）", or "," and "、", and never add or remove the space after a mark.
- Code blocks, URLs, link targets or images.

Only update blocks that need a fix. Do not add, delete or reorder blocks. Keep the document's language.`

// Polish only rewrites existing blocks, without the typing animation.
const htmlUpdateTools = aiDocumentFormats.html.getStreamToolsProvider({
  withDelays: false,
  defaultStreamTools: { add: false, update: true, delete: false }
})

/**
 * Stream tools for polish, hardened against xl-ai's edit-application bugs.
 *
 * - xl-ai applies a streamed update over and over as it arrives, rebasing each
 *   partial version onto the last. Polish doesn't need that live preview, so
 *   partial updates are skipped and each block is applied once, complete.
 * - Turning some updates into suggestion steps throws ("Inconsistent open
 *   depths", "this should have been split into two steps"), which would abort
 *   the whole run. Instead, that block's half-applied suggestions are rolled
 *   back, the block is skipped, and the run carries on.
 */
function createPolishStreamTools(
  onSkippedBlock: (error: unknown) => void
): typeof htmlUpdateTools {
  return {
    getStreamTools: (editor, selectionInfo, onBlockUpdate) =>
      htmlUpdateTools
        .getStreamTools(editor, selectionInfo, onBlockUpdate)
        .map((tool) => ({
          ...tool,
          executor: () => {
            const inner = tool.executor()
            return {
              execute: async (chunk, abortSignal) => {
                const { operation } = chunk
                if (operation.type !== 'update') {
                  return inner.execute(chunk, abortSignal)
                }
                if (chunk.isPossiblyPartial) return true
                try {
                  return await inner.execute(chunk, abortSignal)
                } catch (error) {
                  if (abortSignal?.aborted) throw error
                  // Update ids carry a "$" suffix in xl-ai's HTML format.
                  const { id } = operation as { id?: unknown }
                  if (typeof id === 'string') {
                    rejectBlockChanges(editor, id.replace(/\$$/, ''))
                  }
                  onSkippedBlock(error)
                  return true
                }
              }
            }
          }
        })) as ReturnType<typeof htmlUpdateTools.getStreamTools>
  }
}

// Rolls back any suggestions an aborted update left inside one block.
function rejectBlockChanges(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: BlockNoteEditor<any, any, any>,
  blockId: string
) {
  editor.exec((state, dispatch) => {
    let range: { from: number; to: number } | undefined
    state.doc.descendants((node, pos) => {
      if (range) return false
      if (node.type.name === 'blockContainer' && node.attrs.id === blockId) {
        range = { from: pos, to: pos + node.nodeSize }
        return false
      }
      return true
    })
    if (!range) return false
    dispatch?.(resolveAIChange(state, range, false))
    return true
  })
}

type AIStatus =
  | 'closed'
  | 'user-input'
  | 'thinking'
  | 'ai-writing'
  | 'user-reviewing'
  | 'error'

interface AIReviewBarProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: BlockNoteEditor<any, any, any>
  disabled?: boolean
}

/**
 * One-click AI polish for the whole post, plus a review bar that steps through
 * the AI's suggestions (from polish or the regular AI menu) so each one can be
 * accepted or rejected on its own.
 */
export function AIReviewBar({ editor, disabled }: AIReviewBarProps) {
  const ai = useExtension(AIExtension, { editor })
  const status: AIStatus = useExtensionState(AIExtension, {
    editor,
    selector: (state) =>
      state.aiMenuState === 'closed' ? 'closed' : state.aiMenuState.status
  })
  const reviewing = status === 'user-reviewing'
  const errorMessage = useExtensionState(AIExtension, {
    editor,
    selector: (state) =>
      state.aiMenuState !== 'closed' && state.aiMenuState.status === 'error'
        ? String(state.aiMenuState.error?.message ?? '')
        : ''
  })

  // Re-read the changes whenever the document changes during review.
  const [docVersion, bumpDocVersion] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    if (!reviewing) return
    return editor.onChange(bumpDocVersion)
  }, [editor, reviewing])

  // A failed request can still leave good suggestions behind (one block
  // failing to apply aborts the rest), so those count as reviewable too.
  const failed = status === 'error'
  const changes = useMemo(
    () =>
      reviewing || failed ? collectAIChanges(editor.prosemirrorState.doc) : [],
    // docVersion is the signal that the document changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editor, reviewing, failed, docVersion]
  )

  const [index, setIndex] = useState(0)
  const currentIndex = Math.min(index, changes.length - 1)
  const current: AIChange | undefined = changes[currentIndex]

  const polishing = useRef(false)

  // Close the session once nothing is left to review. This also covers an AI
  // response that made no changes at all.
  useEffect(() => {
    if (!reviewing || changes.length > 0) return
    ai.closeAIMenu()
    if (polishing.current) {
      toast.success('AI review complete')
    }
  }, [ai, reviewing, changes.length])

  const wasReviewing = useRef(false)
  useEffect(() => {
    if (reviewing) wasReviewing.current = true
    if (status !== 'closed') return
    polishing.current = false
    setIndex(0)
    // Drop the selection the review left on the last change, so the editor
    // doesn't reopen with text selected and the formatting toolbar showing.
    if (wasReviewing.current) {
      wasReviewing.current = false
      editor.exec((state, dispatch) => {
        dispatch?.(
          state.tr
            .setSelection(TextSelection.near(state.selection.$to))
            .setMeta('addToHistory', false)
        )
        return true
      })
    }
  }, [editor, status, reviewing])

  // Select the current change and keep that selection visible while the
  // editor is unfocused (via BlockNote's ShowSelection decoration; attributes
  // set directly on editor DOM get wiped when ProseMirror redraws), then
  // scroll it into view.
  const currentFrom = current?.from
  const currentTo = current?.to
  useEffect(() => {
    if (currentFrom === undefined || currentTo === undefined) return
    const showSelection = editor.getExtension(ShowSelectionExtension)
    editor.exec((state, dispatch) => {
      const selection = TextSelection.between(
        state.doc.resolve(currentFrom),
        state.doc.resolve(currentTo)
      )
      dispatch?.(
        state.tr.setSelection(selection).setMeta('addToHistory', false)
      )
      return true
    })
    showSelection?.showSelection(true, 'aiReview')

    const { node } = editor.prosemirrorView.domAtPos(currentFrom)
    const element = node instanceof Element ? node : node.parentElement
    element?.scrollIntoView({ block: 'center', behavior: 'smooth' })

    return () => showSelection?.showSelection(false, 'aiReview')
  }, [editor, currentFrom, currentTo, docVersion])

  // Clicking a suggestion in the editor selects it in the bar.
  useEffect(() => {
    const dom = editor.domElement
    if (!reviewing || !dom) return
    const onClick = (event: MouseEvent) => {
      const pos = editor.prosemirrorView.posAtCoords({
        left: event.clientX,
        top: event.clientY
      })?.pos
      if (pos === undefined) return
      const hit = changes.findIndex((c) => pos >= c.from && pos <= c.to)
      if (hit !== -1) setIndex(hit)
    }
    dom.addEventListener('click', onClick)
    return () => dom.removeEventListener('click', onClick)
  }, [editor, reviewing, changes])

  const polish = async () => {
    const firstBlock = editor.document[0]
    if (!firstBlock) return
    polishing.current = true
    let skipped = 0
    setIndex(0)
    ai.openAIMenuAtBlock(firstBlock.id)
    await ai.invokeAI({
      userPrompt: POLISH_PROMPT,
      useSelection: false,
      streamToolsProvider: createPolishStreamTools((error) => {
        skipped++
        console.warn('AI polish: skipped a block it failed to edit', error)
      })
    })
    if (skipped > 0) {
      toast.warning(
        `AI couldn't apply its edit to ${skipped} block${skipped === 1 ? '' : 's'}; ${skipped === 1 ? 'it was' : 'they were'} left unchanged`
      )
    }
  }

  const resolve = (change: AIChange, accept: boolean) => {
    editor.exec((state, dispatch) => {
      dispatch?.(resolveAIChange(state, change, accept))
      return true
    })
  }

  if (status === 'error') {
    return (
      <Bar>
        <CircleAlert className="text-destructive size-4" />
        <span className="min-w-0 flex-1 truncate text-sm">
          AI request failed{errorMessage ? `: ${errorMessage}` : ''}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => ai.rejectChanges()}
        >
          {changes.length > 0 ? 'Discard all' : 'Dismiss'}
        </Button>
        <Button
          type="button"
          variant={changes.length > 0 ? 'outline' : 'default'}
          size="sm"
          onClick={() => void ai.retry()}
        >
          <RotateCcw />
          Retry
        </Button>
        {changes.length > 0 && (
          <Button
            type="button"
            size="sm"
            onClick={() => ai.setAIResponseStatus('user-reviewing')}
          >
            Review {changes.length} change{changes.length === 1 ? '' : 's'}
          </Button>
        )}
      </Bar>
    )
  }

  if (status === 'thinking' || status === 'ai-writing') {
    return (
      <Bar>
        <Spinner />
        <span className="text-sm">
          {status === 'ai-writing'
            ? 'AI is editing…'
            : polishing.current
              ? 'AI is reading the post…'
              : 'AI is thinking…'}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => ai.abort()}
        >
          <Square />
          Stop
        </Button>
      </Bar>
    )
  }

  if (reviewing && current) {
    return (
      <Bar>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Previous change"
            disabled={currentIndex === 0}
            onClick={() => setIndex(currentIndex - 1)}
          >
            <ChevronLeft />
          </Button>
          <span className="text-muted-foreground min-w-14 text-center text-sm tabular-nums">
            {currentIndex + 1} / {changes.length}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Next change"
            disabled={currentIndex === changes.length - 1}
            onClick={() => setIndex(currentIndex + 1)}
          >
            <ChevronRight />
          </Button>
        </div>

        <ChangePreview change={current} />

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => resolve(current, false)}
          >
            <X />
            Reject
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => resolve(current, true)}
          >
            <Check />
            Accept
          </Button>
          <span className="bg-border mx-1 h-5 w-px" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => ai.rejectChanges()}
          >
            Reject all
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => ai.acceptChanges()}
          >
            <CheckCheck />
            Accept all
          </Button>
        </div>
      </Bar>
    )
  }

  return (
    <div className="mb-2 flex justify-end">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || status !== 'closed'}
        onClick={polish}
      >
        <Sparkles />
        AI polish
      </Button>
    </div>
  )
}

function Bar({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background/90 sticky top-2 z-30 mb-2 flex flex-wrap items-center gap-3 rounded-lg border p-2 shadow-md backdrop-blur">
      {children}
    </div>
  )
}

function ChangePreview({ change }: { change: AIChange }) {
  return (
    <div className="min-w-0 flex-1 text-sm">
      {change.note && (
        <span className="bg-muted text-muted-foreground mr-2 rounded px-1.5 py-0.5 text-xs">
          {change.note}
        </span>
      )}
      <span className="line-clamp-2 break-words">
        {change.contextBefore && (
          <span className="text-muted-foreground">…{change.contextBefore}</span>
        )}
        {change.before === change.after ? (
          change.after
        ) : (
          <>
            {change.before && (
              <del className="bg-red-500/15 text-red-700 dark:text-red-400">
                {change.before}
              </del>
            )}
            {change.after && (
              <ins className="bg-green-500/15 text-green-700 no-underline dark:text-green-400">
                {change.after}
              </ins>
            )}
          </>
        )}
        {change.contextAfter && (
          <span className="text-muted-foreground">{change.contextAfter}…</span>
        )}
      </span>
    </div>
  )
}
