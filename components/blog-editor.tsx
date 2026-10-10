'use client'

import type { PartialBlock } from '@blocknote/core'
import { filterSuggestionItems } from '@blocknote/core/extensions'
import { en } from '@blocknote/core/locales'
import { BlockNoteView } from '@blocknote/mantine'
import {
  FormattingToolbar,
  FormattingToolbarController,
  getDefaultReactSlashMenuItems,
  getFormattingToolbarItems,
  SuggestionMenuController,
  useCreateBlockNote,
  useExtensionState
} from '@blocknote/react'
import {
  AIExtension,
  AIMenu,
  AIMenuController,
  type AIMenuProps,
  AIToolbarButton,
  getAISlashMenuItems
} from '@blocknote/xl-ai'
import { en as aiEn } from '@blocknote/xl-ai/locales'

import '@blocknote/core/fonts/inter.css'
import { DefaultChatTransport } from 'ai'

import '@blocknote/mantine/style.css'
import '@blocknote/xl-ai/style.css'
import { useTheme } from 'next-themes'
import { useEffect, useMemo, useRef } from 'react'

import { blogSchema } from '@/lib/blocknote/schema'
import { useUploadFile } from '@/lib/hooks/use-upload-file'

import { AIReviewBar } from './ai-review-bar'

interface BlogEditorProps {
  /** BlockNote blocks as a JSON string. Read ONCE as initial content. */
  initialContent?: string
  onChange: (contentBlocksJson: string) => void
  /** True from the moment an AI edit starts until its suggestions are resolved. */
  onAIBusyChange?: (busy: boolean) => void
  disabled?: boolean
}

function parseInitialContent(
  initialContent?: string
): PartialBlock[] | undefined {
  if (!initialContent) return undefined
  try {
    const parsed = JSON.parse(initialContent)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : undefined
  } catch {
    return undefined
  }
}

// The AI menu popover is only for typing a prompt. Once a request runs, its
// progress, errors and review live in AIReviewBar, so the popover would just
// cover the text the AI is editing.
function PromptOnlyAIMenu(props: AIMenuProps) {
  const typingPrompt = useExtensionState(AIExtension, {
    selector: (state) =>
      state.aiMenuState !== 'closed' &&
      state.aiMenuState.status === 'user-input'
  })
  return typingPrompt ? <AIMenu {...props} /> : null
}

export function BlogEditor({
  initialContent,
  onChange,
  onAIBusyChange,
  disabled = false
}: BlogEditorProps) {
  const { resolvedTheme } = useTheme()
  const uploadFile = useUploadFile()

  // Freeze initial content so per-keystroke parent re-renders never reset the editor.
  const initialBlocks = useMemo(
    () => parseInitialContent(initialContent),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const editor = useCreateBlockNote({
    schema: blogSchema,
    dictionary: { ...en, ai: aiEn },
    initialContent: initialBlocks,
    extensions: [
      AIExtension({
        transport: new DefaultChatTransport({ api: '/api/ai/chat' })
      })
    ],
    uploadFile
  })

  const aiStatus = useExtensionState(AIExtension, {
    editor,
    selector: (state) =>
      state.aiMenuState === 'closed' ? 'closed' : state.aiMenuState.status
  })
  // Opening the AI menu without running a prompt leaves the content untouched.
  const aiBusy = aiStatus !== 'closed' && aiStatus !== 'user-input'

  const onAIBusyChangeRef = useRef(onAIBusyChange)
  onAIBusyChangeRef.current = onAIBusyChange
  const wasAIBusy = useRef(false)
  useEffect(() => {
    onAIBusyChangeRef.current?.(aiBusy)
    // Changes made during an AI session are held back (the document still
    // carries the suggestion marks); report the resolved content once it ends.
    if (wasAIBusy.current && !aiBusy) {
      onChange(JSON.stringify(editor.document))
    }
    wasAIBusy.current = aiBusy
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiBusy, editor])

  return (
    <>
      <AIReviewBar editor={editor} disabled={disabled} />
      <BlockNoteView
        editor={editor}
        editable={!disabled}
        theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
        formattingToolbar={false}
        slashMenu={false}
        onChange={() => {
          // Read the store directly: the AI may edit before React re-renders.
          const menu = editor.getExtension(AIExtension)?.store.state.aiMenuState
          if (menu && menu !== 'closed' && menu.status !== 'user-input') return
          onChange(JSON.stringify(editor.document))
        }}
      >
        <AIMenuController aiMenu={PromptOnlyAIMenu} />
        {/* The review bar selects each change to highlight it; that selection
            must not pop up the formatting toolbar. */}
        {aiStatus !== 'user-reviewing' && (
          <FormattingToolbarController
            formattingToolbar={() => (
              <FormattingToolbar>
                {getFormattingToolbarItems()}
                <AIToolbarButton />
              </FormattingToolbar>
            )}
          />
        )}
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) =>
            filterSuggestionItems(
              [
                ...getDefaultReactSlashMenuItems(editor),
                ...getAISlashMenuItems(editor)
              ],
              query
            )
          }
        />
      </BlockNoteView>
    </>
  )
}
