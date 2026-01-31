import * as cheerio from 'cheerio'
import { getShiki } from './shiki'

export async function highlightHtml(html: string) {
  console.log('=== Starting HTML highlighting ===')
  console.log('Input HTML length:', html.length)

  const $ = cheerio.load(html, {
    decodeEntities: false,
    xmlMode: false,
    _useHtmlParser2: true
  })
  const shiki = await getShiki()

  const loadedLangs = shiki.getLoadedLanguages()
  console.log('Shiki loaded languages:', loadedLangs.join(', '))

  // Process all pre tags with language- class
  const preElements = $('pre[class*="language-"]')
  console.log(`Found ${preElements.length} code blocks to highlight`)

  if (preElements.length === 0) {
    console.log('No code blocks found with language- class')
    console.log('Available pre tags:', $('pre').length)
    $('pre').each((i, el) => {
      console.log(`  Pre tag ${i}:`, $(el).attr('class') || 'no class')
    })
  }

  let highlightedCount = 0

  preElements.each((_, pre) => {
    const className = $(pre).attr('class') || ''
    const langMatch = className.match(/language-(\w+)/)
    if (!langMatch) {
      console.log('No language match for class:', className)
      return
    }

    let lang = langMatch[1]
    const codeElement = $(pre).find('code')
    const code = codeElement.length > 0 ? codeElement.text() : $(pre).text()

    console.log(`\nProcessing code block #${highlightedCount + 1}:`)
    console.log(`  - Original class: ${className}`)
    console.log(`  - Detected language: ${lang}`)
    console.log(`  - Code length: ${code.length} chars`)
    console.log(`  - Code preview: ${code.substring(0, 50)}...`)

    // Map common language aliases
    const langMap: Record<string, string> = {
      markup: 'html',
      js: 'javascript',
      ts: 'typescript',
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
    if (!loadedLangs.includes(lang as any)) {
      console.warn(`  ✗ Language "${lang}" not supported, keeping original`)
      return
    }

    try {
      // Generate HTML with dual themes (light and dark)
      const highlighted = shiki.codeToHtml(code, {
        lang: lang as any,
        themes: {
          light: 'github-light',
          dark: 'github-dark'
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
