import * as cheerio from 'cheerio'
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

export async function highlightHtml(html: string) {
  const $ = cheerio.load(html)
  const shiki = await getShiki()

  const loadedLangs = shiki.getLoadedLanguages()

  // Inject id attributes into h2/h3 for TOC
  $('h2, h3').each((_, el) => {
    const $el = $(el)
    if (!$el.attr('id')) {
      const id = $el
        .text()
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
      $el.attr('id', id)
    }
  })

  // Process all pre tags with language- class
  // Support both formats:
  // 1. <pre class="language-*"><code>...</code></pre>
  // 2. <pre><code class="language-*">...</code></pre> (TinyMCE format)
  const preElements = $(
    'pre[class*="language-"], pre:has(code[class*="language-"])'
  )

  preElements.each((_, pre) => {
    const $pre = $(pre)
    const $code = $pre.find('code')

    // Check for language class on pre tag first, then on code tag (TinyMCE format)
    const preClass = $pre.attr('class') || ''
    const codeClass = $code.attr('class') || ''
    const className = preClass || codeClass

    const langMatch = className.match(/language-(\w+)/)
    if (!langMatch) return

    let lang = langMatch[1]
    const code = $code.length > 0 ? $code.text() : $pre.text()

    // Map common language aliases
    const langMap: Record<string, string> = {
      markup: 'html',
      js: 'javascript',
      ts: 'typescript',
      go: 'go',
      rs: 'rust',
      py: 'python',
      rb: 'ruby',
      sh: 'bash'
    }

    lang = langMap[lang] || lang

    if (!loadedLangs.includes(lang)) return

    try {
      const highlighted = shiki.codeToHtml(code, {
        lang: lang,
        themes: {
          light: 'houston',
          dark: 'houston'
        }
      })

      $(pre).replaceWith(highlighted)
    } catch {
      // Keep original if highlighting fails
    }
  })

  return $.html()
}
