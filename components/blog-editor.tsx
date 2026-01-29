'use client'

import { uploadApi } from '@/lib/api/upload'
import { Editor } from '@tinymce/tinymce-react'
import { useEffect, useRef, useState } from 'react'
import type { Editor as TinyMCEEditor } from 'tinymce'

interface BlogEditorProps {
  value: string
  onChange: (content: string) => void
  onImageUpload?: (file: File) => Promise<string>
  disabled?: boolean
}

export function BlogEditor({
  value,
  onChange,
  onImageUpload,
  disabled = false
}: BlogEditorProps) {
  const editorRef = useRef<TinyMCEEditor | null>(null)
  const [mounted, setMounted] = useState(false)

  // Only render editor on client side to avoid SSR hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  // 处理图片上传 - 使用预签名 URL 直接上传到 S3
  const handleImageUpload = async (
    blobInfo: any,
    progress: (percent: number) => void
  ): Promise<string> => {
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
        // 图片上传配置
        images_upload_handler: handleImageUpload,
        automatic_uploads: true,
        images_reuse_filename: true,
        // 粘贴配置
        paste_data_images: true,
        paste_as_text: false,
        // 文件选择器配置
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
                alert('图片上传失败')
              }
            }

            input.click()
          }
        },
        // 内容样式
        content_css: 'default',
        skin: 'oxide',
        // 代码编辑器语言
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
        // 表格配置
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
