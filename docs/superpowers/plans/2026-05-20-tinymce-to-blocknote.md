# TinyMCE → BlockNote Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the paid TinyMCE editor with open-source BlockNote.js, storing BlockNote block JSON as the editing source of truth while keeping the existing HTML-based render/search/diff pipeline intact, and migrate all 72 existing posts.

**Architecture:** The admin editor produces BlockNote blocks (JSON). On save, the server converts blocks → clean semantic HTML (`content`) via `@blocknote/server-util`, then runs the existing Shiki pipeline to produce `highlightedContent`. A new `contentBlocks` column holds the JSON source of truth. The public render path (`highlightedContent || content` via React HTML injection), TOC, Algolia, and version diff are unchanged because they keep consuming derived HTML. A one-off script converts the 72 existing posts' HTML → blocks.

**Tech Stack:** Next.js 16, tRPC 11, Drizzle ORM (PostgreSQL/Supabase), `@blocknote/core` + `@blocknote/react` + `@blocknote/mantine` (editor), `@blocknote/server-util` (server-side HTML↔blocks), Shiki (render highlighting), Vitest.

**Spec:** `docs/superpowers/specs/2026-05-20-tinymce-to-blocknote-migration-design.md`

**Branch:** `feat/migrate-tinymce-to-blocknote` (already created; spec committed at `e96ea21`).

---

## File Structure

**New files:**

- `lib/blocknote/schema.ts` — Shared `blogSchema` (BlockNoteSchema) used by BOTH client editor and server util. Single source of truth for block/inline types.
- `lib/blocknote/server.ts` — Server-only helpers: `htmlToBlocks(html)`, `blocksToContentHtml(blocks)` wrapping `ServerBlockNoteEditor`.
- `lib/blocknote/superscript.tsx` — Custom `<sup>` inline content spec (fidelity task).
- `lib/blocknote/divider.tsx` — Custom `<hr>` block spec (fidelity task).
- `scripts/migrate-to-blocknote.ts` — One-off migration of existing posts.
- `__tests__/lib/blocknote/server.test.ts` — Round-trip conversion tests.
- `__tests__/lib/shiki.test.ts` — Language/alias coverage test.

**Modified files:**

- `lib/db/schema.ts` — Add `contentBlocks` to `blogs` and `blogVersions`.
- `lib/validations/blog.ts` — `content` → `contentBlocks`.
- `lib/trpc/routers/blog.ts` — Input/wiring uses `contentBlocks`.
- `lib/services/blog.service.ts` — `createBlog`/`updateBlog` derive HTML from blocks.
- `lib/services/blog-version.service.ts` — Snapshot/restore `contentBlocks`.
- `lib/shiki.ts` — Add missing langs (`graphql`, `tsx`, `jsx`, `scss`) + aliases (`shell`, `yml`).
- `components/blog-editor.tsx` — Rewrite as BlockNote editor.
- `components/blog-form.tsx` — Wire `contentBlocks` field.
- `package.json` — Add BlockNote deps; remove TinyMCE deps.
- `CLAUDE.md`, `.env.example` — Docs cleanup.

---

## Task 1: Install BlockNote dependencies, remove TinyMCE

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Install BlockNote packages**

Run:

```bash
npm install @blocknote/core @blocknote/react @blocknote/mantine @blocknote/server-util
```

Expected: 4 packages added, no peer-dependency errors (React 19 is supported).

- [ ] **Step 2: Remove TinyMCE packages**

Run:

```bash
npm uninstall @tinymce/tinymce-react tinymce
```

Expected: both removed from `package.json` dependencies/devDependencies.

- [ ] **Step 3: Verify install builds the type graph**

Run: `npx tsc --noEmit`
Expected: existing `components/blog-editor.tsx` now fails (imports `@tinymce/tinymce-react` which is gone). This confirms the uninstall worked. The error is expected and fixed in Task 8. No OTHER new errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: add BlockNote packages, remove TinyMCE"
```

---

## Task 2: Shared BlockNote schema

**Files:**

- Create: `lib/blocknote/schema.ts`

Default BlockNote already supports heading levels 1–6, code blocks (with a `language` prop and `language-*` HTML output), images, tables, lists, and quotes. We still define an explicit shared schema so the heading levels are guaranteed and so the client editor and the server util are provably identical. The custom `superscript`/`divider` specs are added later (Task 10); this task wires their extension points but leaves them empty.

- [ ] **Step 1: Write the schema module**

```typescript
// lib/blocknote/schema.ts
import {
  BlockNoteSchema,
  createHeadingBlockSpec,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs
} from '@blocknote/core'

/**
 * Shared BlockNote schema used by BOTH the client editor (useCreateBlockNote)
 * and the server-side converter (ServerBlockNoteEditor). They MUST use the
 * same schema so HTML<->blocks conversion is identical on both sides.
 *
 * Headings are pinned to levels 1-6 because existing posts use h4.
 * Custom specs (superscript, divider) are added in a later task.
 */
export const blogSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    heading: createHeadingBlockSpec({ levels: [1, 2, 3, 4, 5, 6] })
  },
  inlineContentSpecs: {
    ...defaultInlineContentSpecs
  },
  styleSpecs: {
    ...defaultStyleSpecs
  }
})

export type BlogSchema = typeof blogSchema
```

- [ ] **Step 2: Verify exports resolve**

Run: `npx tsc --noEmit lib/blocknote/schema.ts` (or full `npx tsc --noEmit` ignoring the known Task 1 editor error).
Expected: `lib/blocknote/schema.ts` compiles. If `createHeadingBlockSpec` is not exported under that name in the installed version, check the package's exports (`node -e "console.log(Object.keys(require('@blocknote/core')))"`) and use the correct factory; the concept (heading block with `levels: [1..6]`) is the requirement.

- [ ] **Step 3: Commit**

```bash
git add lib/blocknote/schema.ts
git commit -m "feat: add shared BlockNote schema (heading levels 1-6)"
```

---

## Task 3: Server-side conversion helpers (foundation spike)

This validates the riskiest assumption — that `ServerBlockNoteEditor` can round-trip a representative real post — before anything is built on top of it.

**Files:**

- Create: `lib/blocknote/server.ts`
- Test: `__tests__/lib/blocknote/server.test.ts`

- [ ] **Step 1: Write the server helper**

```typescript
// lib/blocknote/server.ts
// NOTE: deliberately NO `import 'server-only'` here. This module is imported
// by the standalone `scripts/migrate-to-blocknote.ts` (plain Node via tsx),
// where `server-only`'s default export throws. These functions are only ever
// imported from server code anyway.
import { ServerBlockNoteEditor } from '@blocknote/server-util'
import type { Block } from '@blocknote/core'
import { blogSchema } from './schema'

// ServerBlockNoteEditor is stateless per call; create once and reuse.
const serverEditor = ServerBlockNoteEditor.create({ schema: blogSchema })

/** Parse a TinyMCE/legacy HTML string into BlockNote blocks. */
export async function htmlToBlocks(html: string): Promise<Block[]> {
  return (await serverEditor.tryParseHTMLToBlocks(html)) as Block[]
}

/** Render BlockNote blocks to clean semantic HTML for storage/render. */
export async function blocksToContentHtml(blocks: Block[]): Promise<string> {
  return await serverEditor.blocksToHTMLLossy(blocks)
}

/** Convenience: legacy HTML -> blocks -> normalized semantic HTML. */
export async function normalizeHtmlViaBlocks(html: string): Promise<{
  blocks: Block[]
  html: string
}> {
  const blocks = await htmlToBlocks(html)
  const normalized = await blocksToContentHtml(blocks)
  return { blocks, html: normalized }
}
```

- [ ] **Step 2: Write the failing round-trip test**

```typescript
// __tests__/lib/blocknote/server.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  blocksToContentHtml,
  htmlToBlocks,
  normalizeHtmlViaBlocks
} from '@/lib/blocknote/server'

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
```

- [ ] **Step 3: Run the test to verify it fails (or reveals real output)**

Run: `npm test -- __tests__/lib/blocknote/server.test.ts`
Expected: It compiles and runs. If `blocksToHTMLLossy` is not the exact method name in the installed version, the import/call throws — inspect `node -e "const {ServerBlockNoteEditor}=require('@blocknote/server-util'); console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(ServerBlockNoteEditor.create())))"` and use the correct method (candidates: `blocksToHTMLLossy`, `blocksToFullHTML`). Pick the one producing clean semantic tags (`<h2>`, `<pre><code>`); adjust `blocksToContentHtml`.

- [ ] **Step 4: Make the test pass**

Adjust `lib/blocknote/server.ts` method names per Step 3 findings until all three tests pass. **Record the actual code-block markup** the chosen method emits (the assertion in the third test tells you which form) — Task 4 depends on it.

Run: `npm test -- __tests__/lib/blocknote/server.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/blocknote/server.ts __tests__/lib/blocknote/server.test.ts
git commit -m "feat: add server-side BlockNote HTML<->blocks conversion + round-trip tests"
```

---

## Task 4: Fix Shiki language/alias coverage

The 72 posts use `graphql`, `tsx`, `jsx`, `scss`, and the aliases `shell`/`yml`, which the current highlighter does not load — those code blocks would render unhighlighted. Also reconcile the code-block class form with what Task 3 Step 4 recorded.

**Files:**

- Modify: `lib/shiki.ts`
- Test: `__tests__/lib/shiki.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/lib/shiki.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest'
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
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- __tests__/lib/shiki.test.ts`
Expected: FAIL — `graphql` not loaded, output still contains `language-graphql`.

- [ ] **Step 3: Add languages and aliases**

In `lib/shiki.ts`, extend the `langs` array in `getShiki()` to include `'graphql'`, `'tsx'`, `'jsx'`, `'scss'` (in addition to the existing list). Then in `highlightHtml()` extend `langMap`:

```typescript
const langMap: Record<string, string> = {
  markup: 'html',
  js: 'javascript',
  ts: 'typescript',
  go: 'go',
  rs: 'rust',
  py: 'python',
  rb: 'ruby',
  sh: 'bash',
  shell: 'bash',
  yml: 'yaml'
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- __tests__/lib/shiki.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/shiki.ts __tests__/lib/shiki.test.ts
git commit -m "fix: add graphql/tsx/jsx/scss langs and shell/yml aliases to Shiki"
```

---

## Task 5: Database schema — add `contentBlocks`

**Files:**

- Modify: `lib/db/schema.ts:102-136`
- Create: migration in `drizzle/`

- [ ] **Step 1: Add columns to schema**

In `lib/db/schema.ts`, add to the `blogs` table (after `highlightedContent`):

```typescript
  contentBlocks: text('content_blocks'),
```

And to the `blogVersions` table (after `content`):

```typescript
  contentBlocks: text('content_blocks'),
```

Both are nullable (existing rows have no blocks until the migration script runs).

- [ ] **Step 2: Generate the migration**

Run: `npm run db:generate`
Expected: a new file in `drizzle/` adding `content_blocks` to both tables. Inspect it; it should be two `ADD COLUMN "content_blocks" text;` statements.

- [ ] **Step 3: Apply to the database**

Run: `npm run db:push`
Expected: columns added; no data loss prompt for existing columns. (If `db:push` shows interactive prompts, answer to ADD the new column — never drop/rename existing columns.)

- [ ] **Step 4: Commit**

```bash
git add lib/db/schema.ts drizzle/
git commit -m "feat: add content_blocks column to blogs and blog_versions"
```

---

## Task 6: Validation + tRPC input use `contentBlocks`

**Files:**

- Modify: `lib/validations/blog.ts:3-12`
- Modify: `lib/trpc/routers/blog.ts` (no signature change needed — it spreads `createBlogSchema`/`updateBlogSchema`)

- [ ] **Step 1: Update the validation schema**

In `lib/validations/blog.ts`, replace the `content` field with `contentBlocks`:

```typescript
export const createBlogSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),
  contentBlocks: z.string().min(1, 'Content is required'),
  summary: z.string().max(500, 'Summary must be less than 500 characters'),
  coverImage: z.url('Cover image must be a valid URL'),
  published: z.boolean().default(false)
})
```

`updateBlogSchema = createBlogSchema.partial()` stays as-is and now carries `contentBlocks`.

- [ ] **Step 2: Update the existing validation test**

Open `__tests__/lib/validations/blog.test.ts`. Replace every `content: '<some html>'` fixture with `contentBlocks: '[{"type":"paragraph"}]'` (any non-empty string passes the `.min(1)` rule). Update any assertion that referenced `content`.

- [ ] **Step 3: Run validation tests**

Run: `npm test -- __tests__/lib/validations/blog.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/validations/blog.ts __tests__/lib/validations/blog.test.ts
git commit -m "feat: blog input uses contentBlocks instead of content HTML"
```

---

## Task 7: BlogService derives HTML from blocks

**Files:**

- Modify: `lib/services/blog.service.ts:96-138`
- Modify: `lib/services/blog-version.service.ts:48-64,113-124`

- [ ] **Step 1: Update `createBlog` and `updateBlog`**

In `lib/services/blog.service.ts`, add the import:

```typescript
import { blocksToContentHtml } from '@/lib/blocknote/server'
```

Replace `createBlog` so it accepts `contentBlocks` (JSON string) instead of `content`, and derives the HTML fields:

```typescript
  static async createBlog(
    data: Omit<InsertBlog, 'id' | 'content' | 'highlightedContent'> & {
      id?: string
      contentBlocks: string
    }
  ): Promise<Blog> {
    const blocks = JSON.parse(data.contentBlocks)
    const content = await blocksToContentHtml(blocks)
    const highlighted = await highlightHtml(content)
    const blogData = {
      ...data,
      id: data.id || uuidv4(),
      content,
      contentBlocks: data.contentBlocks,
      highlightedContent: highlighted
    }
    const [newBlog] = await db
      .insert(blogs)
      .values(blogData as InsertBlog)
      .returning()

    return newBlog
  }
```

Replace the body of `updateBlog` so a `contentBlocks` change regenerates the derived HTML:

```typescript
  static async updateBlog(
    id: string,
    data: Partial<InsertBlog> & { contentBlocks?: string }
  ): Promise<Blog | null> {
    const updateData: Record<string, unknown> = {
      ...data,
      updatedAt: new Date()
    }

    if (data.contentBlocks) {
      const blocks = JSON.parse(data.contentBlocks)
      const content = await blocksToContentHtml(blocks)
      updateData.content = content
      updateData.contentBlocks = data.contentBlocks
      updateData.highlightedContent = await highlightHtml(content)
    }

    const [updatedBlog] = await db
      .update(blogs)
      .set(updateData)
      .where(eq(blogs.id, id))
      .returning()

    return updatedBlog || null
  }
```

- [ ] **Step 2: Snapshot and restore `contentBlocks` in versions**

In `lib/services/blog-version.service.ts` `createVersion`, add `contentBlocks: blog.contentBlocks` to the `.values({...})` insert.

In `restoreVersion`, when updating the blog, also restore the blocks and regenerate highlighted HTML. Add import `import { highlightHtml } from '@/lib/shiki'` and change the `.set({...})` to:

```typescript
      .set({
        title: version.title,
        content: version.content,
        contentBlocks: version.contentBlocks,
        highlightedContent: version.content
          ? await highlightHtml(version.content)
          : undefined,
        summary: version.summary ?? undefined,
        coverImage: version.coverImage ?? undefined,
        updatedAt: new Date()
      })
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: `blog.service.ts` and `blog-version.service.ts` compile. (The editor in `blog-editor.tsx` may still error — fixed in Task 8.)

- [ ] **Step 4: Commit**

```bash
git add lib/services/blog.service.ts lib/services/blog-version.service.ts
git commit -m "feat: derive content/highlightedContent from BlockNote blocks on save"
```

---

## Task 8: Rewrite the editor component

**Files:**

- Rewrite: `components/blog-editor.tsx`

- [ ] **Step 1: Replace the component**

```tsx
// components/blog-editor.tsx
'use client'

import { blogSchema } from '@/lib/blocknote/schema'
import { useTRPC } from '@/lib/trpc/client'
import type { PartialBlock } from '@blocknote/core'
import '@blocknote/core/fonts/inter.css'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/mantine/style.css'
import { useCreateBlockNote } from '@blocknote/react'
import { useMutation } from '@tanstack/react-query'
import { useTheme } from 'next-themes'
import { useMemo } from 'react'

interface BlogEditorProps {
  /** BlockNote blocks as a JSON string. Read ONCE as initial content. */
  initialContent?: string
  onChange: (contentBlocksJson: string) => void
  disabled?: boolean
}

function parseInitialContent(
  initialContent?: string
): PartialBlock[] | undefined {
  if (!initialContent) return undefined
  try {
    const parsed = JSON.parse(initialContent)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : undefined
  } catch {
    return undefined
  }
}

export function BlogEditor({
  initialContent,
  onChange,
  disabled = false
}: BlogEditorProps) {
  const { resolvedTheme } = useTheme()
  const trpc = useTRPC()
  const getPresignedUrl = useMutation(
    trpc.upload.getPresignedUrl.mutationOptions()
  )

  // Freeze initial content so per-keystroke parent re-renders never reset the editor.
  const initialBlocks = useMemo(
    () => parseInitialContent(initialContent),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const editor = useCreateBlockNote({
    schema: blogSchema,
    initialContent: initialBlocks,
    uploadFile: async (file: File) => {
      const { uploadUrl, publicUrl } = await getPresignedUrl.mutateAsync({
        fileName: file.name,
        contentType: file.type
      })
      const res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      })
      if (!res.ok) throw new Error('Failed to upload to S3')
      return publicUrl
    }
  })

  return (
    <BlockNoteView
      editor={editor}
      editable={!disabled}
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      onChange={() => {
        onChange(JSON.stringify(editor.document))
      }}
    />
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: `components/blog-editor.tsx` compiles. `blog-form.tsx` now errors because it passes `value`/old props — fixed in Task 9.

- [ ] **Step 3: Commit**

```bash
git add components/blog-editor.tsx
git commit -m "feat: rewrite blog editor with BlockNote (mantine) + S3 uploadFile"
```

---

## Task 9: Wire `blog-form.tsx` to `contentBlocks`

**Files:**

- Modify: `components/blog-form.tsx`

- [ ] **Step 1: Update the form schema and default values**

In `components/blog-form.tsx`:

- The form derives from `createBlogSchema` (now `contentBlocks`). Update `defaultValues` to use `contentBlocks: blog?.contentBlocks ?? ''` (remove the `content` default).
- Update the `shouldAutoSave` memo: replace `formData?.content?.trim() !== ''` with `formData?.contentBlocks?.trim() !== ''`, and update the dependency array entry from `formData?.content` to `formData?.contentBlocks`.

- [ ] **Step 2: Update the editor Controller**

Replace the content `Controller` block (currently rendering `<BlogEditor value=... onChange=... />`) with:

```tsx
;<Controller
  name="contentBlocks"
  control={control}
  render={({ field }) => (
    <BlogEditor
      initialContent={blog?.contentBlocks ?? undefined}
      onChange={field.onChange}
      disabled={loading}
    />
  )}
/>
{
  errors.contentBlocks && (
    <p className="text-sm text-destructive mt-2">
      {errors.contentBlocks.message}
    </p>
  )
}
```

Note: `initialContent` is fed from `blog?.contentBlocks` (read once), NOT from `field.value`, so RHF state updates do not reset the editor.

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS, no references to the removed `content` field remain.

- [ ] **Step 4: Commit**

```bash
git add components/blog-form.tsx
git commit -m "feat: wire blog form to contentBlocks field"
```

---

## Task 10: Custom `superscript` + `divider` specs (fidelity)

Restores `<sup>` (2 posts) and `<hr>` (1 post). Isolated and late so the core migration is unaffected if these prove problematic server-side.

**Files:**

- Create: `lib/blocknote/superscript.tsx`
- Create: `lib/blocknote/divider.tsx`
- Modify: `lib/blocknote/schema.ts`
- Modify: `__tests__/lib/blocknote/server.test.ts`

- [ ] **Step 1: Write the superscript inline spec**

```tsx
// lib/blocknote/superscript.tsx
import { createReactInlineContentSpec } from '@blocknote/react'

export const Superscript = createReactInlineContentSpec(
  {
    type: 'superscript',
    propSchema: {},
    content: 'styled'
  } as const,
  {
    render: (props) => <sup ref={props.contentRef} />,
    toExternalHTML: (props) => <sup ref={props.contentRef} />,
    parse: (element) => (element.tagName === 'SUP' ? {} : undefined)
  }
)
```

- [ ] **Step 2: Write the divider block spec**

```tsx
// lib/blocknote/divider.tsx
import { createReactBlockSpec } from '@blocknote/react'

export const Divider = createReactBlockSpec(
  {
    type: 'divider',
    propSchema: {},
    content: 'none'
  },
  {
    render: () => <hr />,
    toExternalHTML: () => <hr />,
    parse: (element) => (element.tagName === 'HR' ? {} : undefined)
  }
)
```

- [ ] **Step 3: Register both in the shared schema**

In `lib/blocknote/schema.ts`, import the specs and add them:

```typescript
import { Superscript } from './superscript'
import { Divider } from './divider'
```

Add `divider: Divider` to `blockSpecs` and `superscript: Superscript` to `inlineContentSpecs`. (`createReactBlockSpec` returns a factory; register as `divider: Divider()` if the installed version requires calling it — the Step 5 test will tell you which form compiles/passes.)

- [ ] **Step 4: Add round-trip assertions to the server test**

Append to `__tests__/lib/blocknote/server.test.ts`:

```typescript
describe('fidelity specs', () => {
  it('round-trips <sup> and <hr>', async () => {
    const html = '<p>E = mc<sup>2</sup></p><hr><p>after</p>'
    const { html: out } = await normalizeHtmlViaBlocks(html)
    expect(out).toContain('<sup')
    expect(out).toContain('<hr')
  })
})
```

- [ ] **Step 5: Run the conversion tests**

Run: `npm test -- __tests__/lib/blocknote/server.test.ts`
Expected: PASS (all prior tests + the new sup/hr round-trip). If `ServerBlockNoteEditor` cannot render the React specs server-side (throws, or output is missing `<sup>`/`<hr>`), STOP and report: the fallback is to drop these two specs (revert this task) and hand-fix the 3 affected posts after migration — the spec lists this as acceptable. Do not block the migration on it.

- [ ] **Step 6: Commit**

```bash
git add lib/blocknote/superscript.tsx lib/blocknote/divider.tsx lib/blocknote/schema.ts __tests__/lib/blocknote/server.test.ts
git commit -m "feat: add superscript/divider BlockNote specs for migration fidelity"
```

---

## Task 11: One-off migration script

**Files:**

- Create: `scripts/migrate-to-blocknote.ts`

- [ ] **Step 1: Write the migration script**

```typescript
/**
 * One-off: convert existing blogs' HTML `content` into BlockNote blocks.
 * Stores blocks JSON in `content_blocks`, overwrites `content` with the
 * normalized semantic HTML, and regenerates `highlighted_content`.
 *
 * Idempotent: only processes rows where content_blocks IS NULL.
 *   Dry run:  npx tsx scripts/migrate-to-blocknote.ts --dry
 *   Apply:    npx tsx scripts/migrate-to-blocknote.ts
 */
import { config } from 'dotenv'
config({ path: '.env' })

import { blocksToContentHtml, htmlToBlocks } from '@/lib/blocknote/server'
import { highlightHtml } from '@/lib/shiki'
import postgres from 'postgres'

const DRY = process.argv.includes('--dry')

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not defined')
  const sql = postgres(process.env.DATABASE_URL, { max: 1 })

  try {
    const rows = await sql<{ id: string; title: string; content: string }[]>`
      select id, title, content from blogs where content_blocks is null
    `
    console.log(`Found ${rows.length} post(s) to migrate (DRY=${DRY})`)

    let ok = 0
    const failures: { id: string; title: string; error: string }[] = []

    for (const row of rows) {
      try {
        const blocks = await htmlToBlocks(row.content)
        const content = await blocksToContentHtml(blocks)
        const highlighted = await highlightHtml(content)
        const contentBlocks = JSON.stringify(blocks)

        if (!DRY) {
          await sql`
            update blogs
            set content_blocks = ${contentBlocks},
                content = ${content},
                highlighted_content = ${highlighted}
            where id = ${row.id}
          `
        }
        ok++
        console.log(`  ✓ ${row.title} (${blocks.length} blocks)`)
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        failures.push({ id: row.id, title: row.title, error })
        console.error(`  ✗ ${row.title}: ${error}`)
      }
    }

    console.log(`\nDone. ok=${ok}, failed=${failures.length}`)
    if (failures.length) {
      console.log('Failures:', JSON.stringify(failures, null, 2))
      process.exitCode = 1
    }
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error('Migration crashed:', err)
  process.exit(1)
})
```

- [ ] **Step 2: Re-run a fresh backup (safety)**

Run: `npx tsx scripts/backup-blogs.ts`
Expected: a new timestamped file in `backups/`.

- [ ] **Step 3: Dry run**

Run: `npx tsx scripts/migrate-to-blocknote.ts --dry`
Expected: `Found 72 post(s)`, each printing `✓ <title> (N blocks)` with `N > 0`, `failed=0`. If any post yields 0 blocks or fails, inspect that post's HTML in the backup before applying.

If the run fails with a module-resolution error for `@/lib/...`, tsx is not resolving the tsconfig `paths` alias. Fix by switching the two `@/`-prefixed imports in this script to relative paths (`../lib/blocknote/server`, `../lib/shiki`) — the modules they pull in are alias-free, so relative imports resolve cleanly.

- [ ] **Step 4: Apply**

Run: `npx tsx scripts/migrate-to-blocknote.ts`
Expected: `ok=72, failed=0`.

- [ ] **Step 5: Spot-check the database**

Run:

```bash
node -e "const p=require('postgres');require('dotenv').config({path:'.env'});const sql=p(process.env.DATABASE_URL,{max:1});(async()=>{const r=await sql\`select count(*) as n from blogs where content_blocks is null\`;console.log('rows still missing blocks:',r[0].n);await sql.end()})()"
```

Expected: `rows still missing blocks: 0`.

- [ ] **Step 6: Commit**

```bash
git add scripts/migrate-to-blocknote.ts
git commit -m "feat: add one-off TinyMCE HTML -> BlockNote migration script"
```

---

## Task 12: Manual end-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify a migrated post renders**

Open a migrated post's public page (`/post/<id>`). Confirm: headings, code blocks are syntax-highlighted (incl. a graphql/tsx post), images load, tables/lists/quotes render, TOC sidebar lists h2/h3.

- [ ] **Step 3: Verify editing a migrated post**

Open `/admin/blog-management/edit/<id>`. Confirm the BlockNote editor loads the existing content as blocks, edits work, image upload works (drag/paste an image → S3 URL appears), light/dark theme matches.

- [ ] **Step 4: Verify create + autosave + publish**

Create a new post, type content incl. a code block and an image, confirm autosave fires (draft toast), publish, then confirm the public page renders correctly with highlighted code.

- [ ] **Step 5: Verify a code language fidelity post**

Open a post that used `graphql`/`tsx`/`scss`/`shell` and confirm those code blocks are highlighted (not plain).

---

## Task 13: Docs + env cleanup

**Files:**

- Modify: `CLAUDE.md`
- Modify: `.env.example`

- [ ] **Step 1: Remove the TinyMCE env var**

In `.env.example`, remove the `NEXT_PUBLIC_TINYMCE_API_KEY` line and its comment.

- [ ] **Step 2: Search for any remaining TinyMCE references**

Run: `grep -rin "tinymce" --include="*.ts" --include="*.tsx" --include="*.md" . --exclude-dir=node_modules --exclude-dir=.next`
Expected: only historical mentions in `docs/superpowers/`. If any live code/config references remain, remove them.

- [ ] **Step 3: Update CLAUDE.md**

In `CLAUDE.md`: change the "Editor: TinyMCE (WYSIWYG...)" tech-stack line to "Editor: BlockNote.js (block-based, blocks JSON source of truth)". Update the "Content Editor" env section (remove `NEXT_PUBLIC_TINYMCE_API_KEY`). Add a short note under the Database Schema section that `blogs.contentBlocks` (and `blog_versions.contentBlocks`) holds the BlockNote block JSON source of truth, while `content`/`highlightedContent` are derived HTML for rendering/search/diff.

- [ ] **Step 4: Final full check**

Run: `npm run lint && npx tsc --noEmit && npm test`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md .env.example
git commit -m "docs: replace TinyMCE references with BlockNote"
```

---

## Done criteria

- All 72 posts have non-null `content_blocks`; public pages render identically or better (code highlighting now covers graphql/tsx/jsx/scss/shell/yml).
- Admin editor is BlockNote; create/edit/autosave/publish/image-upload all work.
- No `tinymce` packages or `NEXT_PUBLIC_TINYMCE_API_KEY` remain.
- `npm run lint`, `npx tsc --noEmit`, and `npm test` all pass.
- Backup JSON(s) retained in `backups/` (git-ignored).
