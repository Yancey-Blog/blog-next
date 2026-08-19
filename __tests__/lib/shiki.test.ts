import { describe, expect, it } from 'vitest'

// @vitest-environment node
import { highlightHtml } from '@/lib/shiki'

describe('highlightHtml language coverage', () => {
  it('highlights graphql code blocks', async () => {
    const html =
      '<pre><code class="language-graphql">type Query { a: String }</code></pre>'
    const out = await highlightHtml(html)
    // Shiki replaces <pre> with a <pre class="shiki ...">
    expect(out).toContain('shiki')
    expect(out).not.toContain('language-graphql')
  })

  it('resolves shell alias to bash', async () => {
    const html = '<pre><code class="language-shell">echo hello</code></pre>'
    const out = await highlightHtml(html)
    expect(out).toContain('shiki')
  })

  it('highlights scss code blocks', async () => {
    const html =
      '<pre><code class="language-scss">.a { .b { color: red; } }</code></pre>'
    const out = await highlightHtml(html)
    expect(out).toContain('shiki')
    expect(out).not.toContain('language-scss')
  })

  it('highlights tsx and jsx code blocks', async () => {
    const tsx = await highlightHtml(
      '<pre><code class="language-tsx">const A = () => <div />;</code></pre>'
    )
    expect(tsx).toContain('shiki')
    const jsx = await highlightHtml(
      '<pre><code class="language-jsx">const A = () => <div />;</code></pre>'
    )
    expect(jsx).toContain('shiki')
  })
})

describe('highlightHtml heading id generation', () => {
  it('slugifies a CJK-only heading instead of stripping it to empty', async () => {
    const out = await highlightHtml('<h2>人类看到的不是截图，而是视频流</h2>')
    const match = out.match(/<h2 id="([^"]*)"/)
    expect(match?.[1]).toBeTruthy()
  })

  it('assigns unique ids to headings that slugify to the same value', async () => {
    const out = await highlightHtml('<h2>你好，世界</h2><h2>你好！世界</h2>')
    const ids = [...out.matchAll(/<h2 id="([^"]*)"/g)].map((m) => m[1])
    expect(ids).toHaveLength(2)
    expect(new Set(ids).size).toBe(2)
    expect(ids.every(Boolean)).toBe(true)
  })

  it('falls back to a positional id when a heading has no letters or numbers', async () => {
    const out = await highlightHtml('<h2>---</h2>')
    expect(out).toContain('<h2 id="heading-0">')
  })

  it('leaves an existing id untouched', async () => {
    const out = await highlightHtml('<h2 id="custom-id">Title</h2>')
    expect(out).toContain('<h2 id="custom-id">')
  })
})
