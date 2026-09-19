/**
 * Generate AVIF/WebP/LQIP derivatives for images that are already in the bucket.
 * Safe to re-run: keys whose LQIP exists are skipped.
 *
 *   pnpm images:backfill --dry-run           list what would happen, write nothing
 *   pnpm images:backfill                     process everything that is missing
 *   pnpm images:backfill --force             regenerate even when derivatives exist
 *   pnpm images:backfill --only <key>        restrict to a single original
 *
 * Also repairs originals whose Content-Type is wrong (for example
 * application/octet-stream) by copying them onto themselves with new metadata.
 * The bucket is versioned, so that is reversible.
 */
import {
  contentTypeForKey,
  isEligibleKey,
  lqipKey
} from '@/lib/images/derivatives'
import { generateDerivatives } from '@/lib/images/process'
import { headObject, listAllKeys, s3ObjectStore } from '@/lib/images/s3-store'

const CONCURRENCY = 3

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const force = args.includes('--force')
const onlyIndex = args.indexOf('--only')
const only = onlyIndex >= 0 ? args[onlyIndex + 1] : undefined

type Outcome = 'processed' | 'skipped'

async function backfillKey(key: string): Promise<Outcome> {
  const original = await headObject(key)
  if (!original) throw new Error('original not found')

  const expectedType = contentTypeForKey(key)
  const needsTypeFix = original.contentType !== expectedType
  const needsDerivatives = force || (await headObject(lqipKey(key))) === null

  if (!needsDerivatives && !needsTypeFix) return 'skipped'

  const actions = [
    needsDerivatives ? 'derivatives' : null,
    needsTypeFix
      ? `content-type ${original.contentType} -> ${expectedType}`
      : null
  ].filter(Boolean)
  console.log(`${dryRun ? '[dry-run] ' : ''}${key}: ${actions.join(', ')}`)
  if (dryRun) return 'processed'

  if (needsDerivatives) {
    const buffer = await s3ObjectStore.get(key)
    await generateDerivatives(s3ObjectStore, key, buffer)
  }
  if (needsTypeFix) {
    await s3ObjectStore.copy(key, key, expectedType)
  }
  return 'processed'
}

async function main() {
  const keys = only
    ? [only]
    : (await listAllKeys()).filter(isEligibleKey).sort()
  if (only && !isEligibleKey(only)) {
    throw new Error(`Not an eligible original: ${only}`)
  }
  console.log(`${keys.length} eligible original(s)`)

  const counts = { processed: 0, skipped: 0 }
  const failures: { key: string; message: string }[] = []
  let next = 0

  async function worker() {
    while (next < keys.length) {
      const key = keys[next++]
      try {
        counts[await backfillKey(key)]++
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        failures.push({ key, message })
        console.error(`FAILED ${key}: ${message}`)
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  console.log(
    `\n${dryRun ? 'Would process' : 'Processed'}: ${counts.processed}, skipped: ${counts.skipped}, failed: ${failures.length}`
  )
  for (const failure of failures) {
    console.log(`  ${failure.key}: ${failure.message}`)
  }
  if (failures.length > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
