'use client'

import { blogSchema } from '@/lib/blocknote/schema'
import { useTRPC } from '@/lib/trpc/client'
import type { PartialBlock } from '@blocknote/core'
import '@blocknote/core/fonts/inter.css'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/mantine/style.css'
import { useCreateBlockNote } from '@blocknote/react'
import { useMutation } from '@tanstack/react-query'
import { useTheme } from 'next-themes'
import { useMemo } from 'react'

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
    initialContent: initialBlocks,
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
      onChange={() => {
        onChange(JSON.stringify(editor.document))
      }}
    />
  )
}
