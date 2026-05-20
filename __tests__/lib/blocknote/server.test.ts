// @vitest-environment node
import { htmlToBlocks, normalizeHtmlViaBlocks } from '@/lib/blocknote/server'
import { describe, expect, it } from 'vitest'

const SAMPLE = `
<h2>Heading two</h2>
<h3>Heading three</h3>
<h4>Heading four</h4>
<p>Paragraph with <strong>bold</strong> and <em>italic</em> and a
<a href="https://example.com">link</a>.</p>
<ul><li>one</li><li>two</li></ul>
<ol><li>first</li><li>second</li></ol>
<blockquote>quoted text</blockquote>
<pre class="language-typescript"><code class="language-typescript">const x: number = 1</code></pre>
<img src="https://example.com/a.png" alt="alt text" />
<table><thead><tr><th>h1</th><th>h2</th></tr></thead>
<tbody><tr><td>a</td><td>b</td></tr></tbody></table>
`

describe('blocknote server conversion', () => {
  it('parses representative HTML into non-empty blocks', async () => {
    const blocks = await htmlToBlocks(SAMPLE)
    expect(blocks.length).toBeGreaterThan(0)
  })

  it('round-trips core block types back to HTML', async () => {
    const { html } = await normalizeHtmlViaBlocks(SAMPLE)
    expect(html).toContain('<h2')
    expect(html).toContain('<h3')
    expect(html).toContain('<h4')
    expect(html).toMatch(/<ul|<li/)
    expect(html).toMatch(/<ol/)
    expect(html).toContain('blockquote')
    expect(html).toContain('<pre')
    expect(html).toContain('<code')
    expect(html).toContain('example.com/a.png')
    expect(html).toContain('<table')
    expect(html).toContain('bold')
    expect(html).toContain('https://example.com')
  })

  it('emits a language class on code blocks the Shiki step can read', async () => {
    const { html } = await normalizeHtmlViaBlocks(SAMPLE)
    // Used to confirm the regex contract with lib/shiki.ts highlightHtml().
    expect(html).toMatch(
      /language-typescript|lang="typescript"|data-language="typescript"/
    )
  })
})

describe('fidelity specs', () => {
  it('round-trips <sup> and <hr>', async () => {
    const html = '<p>E = mc<sup>2</sup></p><hr><p>after</p>'
    const { html: out } = await normalizeHtmlViaBlocks(html)
    expect(out).toContain('<sup')
    expect(out).toContain('<hr')
  })
})
