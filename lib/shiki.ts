import { createHighlighter } from 'shiki'

let highlighter: Awaited<ReturnType<typeof createHighlighter>> | null = null

export async function getShiki() {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: ['houston'],
      langs: [
        'html',
        'xml',
        'css',
        'javascript',
        'typescript',
        'python',
        'java',
        'c',
        'cpp',
        'csharp',
        'php',
        'ruby',
        'go',
        'rust',
        'sql',
        'bash',
        'json',
        'yaml',
        'markdown'
      ]
    })
  }

  return highlighter
}
