import type { Block } from '@blocknote/core'
import { describe, expect, it } from 'vitest'

// @vitest-environment node
import { blocksToContentHtml } from '@/lib/blocknote/server'

// Minimal blocks covering the types used on the save path. Cast through
// unknown because these are partial shapes; blocksToHTMLLossy fills the rest.
const BLOCKS = [
  {
    type: 'heading',
    props: { level: 2 },
    content: [{ type: 'text', text: 'Heading two', styles: {} }]
  },
  {
    type: 'paragraph',
    content: [
      { type: 'text', text: 'Some ', styles: {} },
      { type: 'text', text: 'bold', styles: { bold: true } },
      { type: 'text', text: ' text', styles: {} }
    ]
  },
  {
    type: 'codeBlock',
    props: { language: 'typescript' },
    content: [{ type: 'text', text: 'const x: number = 1', styles: {} }]
  }
] as unknown as Block[]

describe('blocksToContentHtml', () => {
  it('renders blocks to clean semantic HTML', async () => {
    const html = await blocksToContentHtml(BLOCKS)
    expect(html).toContain('<h2')
    expect(html).toContain('Heading two')
    expect(html).toContain('<p')
    expect(html).toContain('bold')
    expect(html).toContain('<pre')
    expect(html).toContain('<code')
    expect(html).toContain('const x: number = 1')
  })

  it('emits a language class the Shiki step can read', async () => {
    const html = await blocksToContentHtml(BLOCKS)
    expect(html).toMatch(
      /language-typescript|lang="typescript"|data-language="typescript"/
    )
  })

  it('returns a string for an empty document', async () => {
    const html = await blocksToContentHtml([])
    expect(typeof html).toBe('string')
  })
})
