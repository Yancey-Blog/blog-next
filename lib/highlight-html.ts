import * as cheerio from 'cheerio'
import { getShiki } from './shiki'

export async function highlightHtml(html: string) {
  console.log('=== Starting HTML highlighting ===')
  console.log('Input HTML length:', html.length)

  const $ = cheerio.load(html)
  const shiki = await getShiki()

  const loadedLangs = shiki.getLoadedLanguages()
  console.log('Shiki loaded languages:', loadedLangs.join(', '))

  // Process all pre tags with language- class
  // Support both formats:
  // 1. <pre class="language-*"><code>...</code></pre>
  // 2. <pre><code class="language-*">...</code></pre> (TinyMCE format)
  const preElements = $(
    'pre[class*="language-"], pre:has(code[class*="language-"])'
  )
  console.log(`Found ${preElements.length} code blocks to highlight`)

  if (preElements.length === 0) {
    console.log('No code blocks found with language- class')
    console.log('Available pre tags:', $('pre').length)
    $('pre').each((i, el) => {
      const preClass = $(el).attr('class') || 'no class'
      const codeClass = $(el).find('code').attr('class') || 'no class'
      console.log(`  Pre tag ${i}: pre="${preClass}", code="${codeClass}"`)
    })
  }

  let highlightedCount = 0

  preElements.each((_, pre) => {
    const $pre = $(pre)
    const $code = $pre.find('code')

    // Check for language class on pre tag first, then on code tag (TinyMCE format)
    const preClass = $pre.attr('class') || ''
    const codeClass = $code.attr('class') || ''
    const className = preClass || codeClass

    const langMatch = className.match(/language-(\w+)/)
    if (!langMatch) {
      console.log('No language match for classes:', { preClass, codeClass })
      return
    }

    let lang = langMatch[1]
    // Get code content from code element if exists, otherwise from pre
    const code = $code.length > 0 ? $code.text() : $pre.text()

    console.log(`\nProcessing code block #${highlightedCount + 1}:`)
    console.log(`  - Pre class: "${preClass}"`)
    console.log(`  - Code class: "${codeClass}"`)
    console.log(`  - Detected language: ${lang}`)
    console.log(`  - Code length: ${code.length} chars`)
    console.log(`  - Code preview: ${code.substring(0, 50)}...`)

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

    const originalLang = lang
    lang = langMap[lang] || lang

    if (originalLang !== lang) {
      console.log(`  - Mapped to: ${lang}`)
    }

    // Check if language is supported
    if (!loadedLangs.includes(lang)) {
      console.warn(`  ✗ Language "${lang}" not supported, keeping original`)
      return
    }

    try {
      // Generate HTML with dual themes (light and dark)
      const highlighted = shiki.codeToHtml(code, {
        lang: lang,
        themes: {
          light: 'houston',
          dark: 'houston'
        }
      })

      console.log(`  ✓ Successfully highlighted ${lang} code block`)
      console.log(`  - Output length: ${highlighted.length} chars`)
      console.log(`  - Output preview: ${highlighted.substring(0, 100)}...`)

      $(pre).replaceWith(highlighted)
      highlightedCount++
    } catch (error) {
      console.error(`  ✗ Shiki highlighting error for "${lang}":`, error)
    }
  })

  const result = $.html()
  console.log(`\n=== Highlighting complete ===`)
  console.log(`Processed ${highlightedCount}/${preElements.length} code blocks`)
  console.log(`Output HTML length: ${result.length}`)
  console.log('=================================\n')

  return result
}
