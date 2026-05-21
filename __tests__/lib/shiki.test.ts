// @vitest-environment node
import { highlightHtml } from '@/lib/shiki'
import { describe, expect, it } from 'vitest'

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
