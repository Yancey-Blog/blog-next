/**
 * One-off: convert existing blogs' HTML `content` into BlockNote blocks.
 * Stores blocks JSON in `content_blocks`, overwrites `content` with the
 * normalized semantic HTML, and regenerates `highlighted_content`.
 *
 * Two source modes:
 *   - default: read `content` from the DB for rows where content_blocks IS
 *     NULL (idempotent first pass).
 *   - --from-backup=<file>: read the ORIGINAL HTML from a backup JSON and
 *     re-convert every post (overwriting existing blocks). Use this to
 *     re-run after a conversion fix, since the DB `content` is already the
 *     (lossy) derived HTML once the first pass has run.
 *
 * Run with vite-node (NOT tsx): tsx's CJS transform breaks BlockNote's
 * tiptap dependency, while vite-node uses the same loader as the test suite.
 *   Dry run:  npm run migrate:blocknote -- --dry
 *   Apply:    npm run migrate:blocknote
 *   Re-run:   npm run migrate:blocknote -- --from-backup=backups/<file>.json
 */
import { config } from 'dotenv'
config({ path: '.env' })

import { blocksToContentHtml, htmlToBlocks } from '@/lib/blocknote/server'
import { highlightHtml } from '@/lib/shiki'
import { readFileSync } from 'node:fs'
import postgres from 'postgres'

const DRY = process.argv.includes('--dry')
const backupArg = process.argv.find((a) => a.startsWith('--from-backup='))
const backupPath = backupArg ? backupArg.slice('--from-backup='.length) : null

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not defined')
  const sql = postgres(process.env.DATABASE_URL, { max: 1 })

  try {
    let rows: { id: string; title: string; content: string }[]
    if (backupPath) {
      const backup = JSON.parse(readFileSync(backupPath, 'utf8')) as {
        blogs: { id: string; title: string; content: string }[]
      }
      rows = backup.blogs.map((b) => ({
        id: b.id,
        title: b.title,
        content: b.content
      }))
      console.log(
        `Re-migrating ${rows.length} post(s) from backup ${backupPath} (DRY=${DRY})`
      )
    } else {
      rows = await sql<{ id: string; title: string; content: string }[]>`
        select id, title, content from blogs where content_blocks is null
      `
      console.log(`Found ${rows.length} post(s) to migrate (DRY=${DRY})`)
    }

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
