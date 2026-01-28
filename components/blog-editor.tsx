'use client'

import { Editor } from '@tinymce/tinymce-react'
import { useRef } from 'react'
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

  // 处理图片上传
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

    // 默认上传到 API
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '上传失败')
      }

      const data = await response.json()
      return data.url
    } catch (error) {
      console.error('Image upload failed:', error)
      throw error
    }
  }

  return (
    <Editor
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
                  const formData = new FormData()
                  formData.append('file', file)

                  const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                  })

                  if (!response.ok) {
                    throw new Error('上传失败')
                  }

                  const data = await response.json()
                  url = data.url
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
        // 链接配置
        link_default_target: '_blank',
        link_assume_external_targets: true,
        // 表格配置
        table_responsive_width: true,
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
