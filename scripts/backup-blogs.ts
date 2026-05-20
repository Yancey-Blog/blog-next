/**
 * One-off safety backup: dumps the `blogs` and `blog_versions` tables to
 * timestamped JSON files under ./backups before the TinyMCE -> BlockNote
 * content migration. Run with: npx tsx scripts/backup-blogs.ts
 */
import { config } from 'dotenv'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import postgres from 'postgres'

config({ path: '.env' })

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined')
}

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 })

  try {
    const blogs = await sql`select * from blogs order by created_at asc`
    const blogVersions =
      await sql`select * from blog_versions order by created_at asc`

    const dir = join(process.cwd(), 'backups')
    mkdirSync(dir, { recursive: true })

    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const file = join(dir, `blogs-backup-${stamp}.json`)

    writeFileSync(
      file,
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          counts: { blogs: blogs.length, blogVersions: blogVersions.length },
          blogs,
          blogVersions
        },
        null,
        2
      )
    )

    console.log(`✅ Backup written to ${file}`)
    console.log(
      `   blogs: ${blogs.length} rows, blog_versions: ${blogVersions.length} rows`
    )
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error('❌ Backup failed:', err)
  process.exit(1)
})
