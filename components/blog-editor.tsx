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
  useCreateBlockNote
} from '@blocknote/react'
import {
  AIExtension,
  AIMenuController,
  AIToolbarButton,
  getAISlashMenuItems
} from '@blocknote/xl-ai'
import { en as aiEn } from '@blocknote/xl-ai/locales'

import '@blocknote/core/fonts/inter.css'
import { useMutation } from '@tanstack/react-query'
import { DefaultChatTransport } from 'ai'

import '@blocknote/mantine/style.css'
import '@blocknote/xl-ai/style.css'
import { useTheme } from 'next-themes'
import { useMemo } from 'react'

import { blogSchema } from '@/lib/blocknote/schema'
import { useTRPC } from '@/lib/trpc/client'

interface BlogEditorProps {
  /** BlockNote blocks as a JSON string. Read ONCE as initial content. */
  initialContent?: string
  onChange: (contentBlocksJson: string) => void
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

export function BlogEditor({
  initialContent,
  onChange,
  disabled = false
}: BlogEditorProps) {
  const { resolvedTheme } = useTheme()
  const trpc = useTRPC()
  const getPresignedUrl = useMutation(
    trpc.upload.getPresignedUrl.mutationOptions()
  )

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
    uploadFile: async (file: File) => {
      const { uploadUrl, publicUrl } = await getPresignedUrl.mutateAsync({
        fileName: file.name,
        contentType: file.type
      })
      const res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      })
      if (!res.ok) throw new Error('Failed to upload to S3')
      return publicUrl
    }
  })

  return (
    <BlockNoteView
      editor={editor}
      editable={!disabled}
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      formattingToolbar={false}
      slashMenu={false}
      onChange={() => {
        onChange(JSON.stringify(editor.document))
      }}
    >
      <AIMenuController />
      <FormattingToolbarController
        formattingToolbar={() => (
          <FormattingToolbar>
            {getFormattingToolbarItems()}
            <AIToolbarButton />
          </FormattingToolbar>
        )}
      />
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
  )
}
