'use client'

import { uploadApi } from '@/lib/api/upload'
import { Editor } from '@tinymce/tinymce-react'
import { useTheme } from 'next-themes'
import { useRef, useState } from 'react'
import type { Editor as TinyMCEEditor } from 'tinymce'

interface BlogEditorProps {
  value: string
  onChange: (content: string) => void
  onImageUpload?: (file: File) => Promise<string>
  disabled?: boolean
}

interface BlobInfo {
  blob: () => Blob
  filename: () => string
}

export function BlogEditor({
  value,
  onChange,
  onImageUpload,
  disabled = false
}: BlogEditorProps) {
  const editorRef = useRef<TinyMCEEditor | null>(null)
  const { resolvedTheme } = useTheme()
  const [mounted] = useState(true)

  // Detect dark mode - use as key to force re-render when theme changes
  const isDarkMode = resolvedTheme === 'dark'
  const editorKey = `tinymce-${isDarkMode ? 'dark' : 'light'}`

  /**
   * Handle image upload to S3
   * Uses presigned URLs for direct upload to S3 bucket
   */
  const handleImageUpload = async (blobInfo: BlobInfo): Promise<string> => {
    const file = blobInfo.blob() as File

    if (onImageUpload) {
      try {
        const url = await onImageUpload(file)
        return url
      } catch (error) {
        console.error('Image upload failed:', error)
        throw error
      }
    }

    try {
      // Step 1: Get presigned URL
      const { uploadUrl, publicUrl } = await uploadApi.getPresignedUrl({
        fileName: file.name,
        contentType: file.type
      })

      // Step 2: Upload directly to S3
      await uploadApi.uploadToS3(uploadUrl, file)

      return publicUrl
    } catch (error) {
      console.error('Image upload failed:', error)
      throw error
    }
  }

  // Show loading state on server side
  if (!mounted) {
    return (
      <div className="flex h-150 items-center justify-center rounded-md border bg-muted">
        <p className="text-sm text-muted-foreground">Loading editor...</p>
      </div>
    )
  }

  return (
    <Editor
      key={editorKey}
      id="blog-content-editor"
      apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
      value={value}
      onEditorChange={onChange}
      onInit={(evt, editor) => {
        editorRef.current = editor
      }}
      disabled={disabled}
      init={{
        height: 600,
        menubar: true,
        skin: isDarkMode ? 'oxide-dark' : 'oxide',
        content_css: isDarkMode ? 'dark' : 'default',
        plugins: [
          // Core editing features
          'anchor',
          'autolink',
          'charmap',
          'codesample',
          'emoticons',
          'image',
          'link',
          'lists',
          'media',
          'searchreplace',
          'table',
          'visualblocks',
          'wordcount',
          'code',
          'fullscreen',
          'preview',
          'help',
          // Premium features (if available)
          'checklist',
          'mediaembed',
          'casechange',
          'formatpainter',
          'pageembed',
          'permanentpen',
          'powerpaste',
          'advtable',
          'advcode',
          'tableofcontents',
          'footnotes',
          'autocorrect',
          'typography',
          'inlinecss',
          'markdown'
        ],
        toolbar:
          'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | ' +
          'link image media table | align lineheight | ' +
          'checklist numlist bullist indent outdent | ' +
          'emoticons charmap | code fullscreen preview | ' +
          'removeformat help',
        content_style:
          'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
        // Image upload configuration
        images_upload_handler: handleImageUpload,
        automatic_uploads: true,
        images_reuse_filename: true,
        // Paste configuration
        paste_data_images: true,
        paste_as_text: false,
        // File picker configuration
        file_picker_types: 'image',
        file_picker_callback: (callback, value, meta) => {
          if (meta.filetype === 'image') {
            const input = document.createElement('input')
            input.setAttribute('type', 'file')
            input.setAttribute('accept', 'image/*')

            input.onchange = async () => {
              const file = input.files?.[0]
              if (!file) return

              try {
                let url: string
                if (onImageUpload) {
                  url = await onImageUpload(file)
                } else {
                  // Get presigned URL and upload directly to S3
                  const { uploadUrl, publicUrl } =
                    await uploadApi.getPresignedUrl({
                      fileName: file.name,
                      contentType: file.type
                    })

                  await uploadApi.uploadToS3(uploadUrl, file)

                  url = publicUrl
                }

                callback(url, { alt: file.name })
              } catch (error) {
                console.error('Image upload failed:', error)
                alert('Image upload failed')
              }
            }

            input.click()
          }
        },
        // Code editor language options
        codesample_languages: [
          { text: 'HTML/XML', value: 'markup' },
          { text: 'JavaScript', value: 'javascript' },
          { text: 'TypeScript', value: 'typescript' },
          { text: 'CSS', value: 'css' },
          { text: 'Python', value: 'python' },
          { text: 'Java', value: 'java' },
          { text: 'C', value: 'c' },
          { text: 'C++', value: 'cpp' },
          { text: 'C#', value: 'csharp' },
          { text: 'PHP', value: 'php' },
          { text: 'Ruby', value: 'ruby' },
          { text: 'Go', value: 'go' },
          { text: 'Rust', value: 'rust' },
          { text: 'SQL', value: 'sql' },
          { text: 'Bash', value: 'bash' }
        ],
        link_default_target: '_blank',
        link_assume_external_targets: true,
        // Table configuration
        table_default_attributes: {
          border: '1'
        },
        table_default_styles: {
          'border-collapse': 'collapse',
          width: '100%'
        }
      }}
    />
  )
}
