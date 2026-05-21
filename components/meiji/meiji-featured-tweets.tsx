import { parseTweetId, type FeaturedTweet } from '@/lib/validations/meiji'
import { Suspense } from 'react'
import { EmbeddedTweet } from 'react-tweet'
import { getTweet } from 'react-tweet/api'
import { MeijiReveal } from './meiji-reveal'

function TweetSkeleton() {
  return (
    <div
      className="meiji-card h-64 w-full animate-pulse"
      style={{ background: 'var(--m-cream-2)' }}
    />
  )
}

/** Cute fallback shown when the embed can't be fetched (e.g. offline/dev). */
function TweetFallback({ url, note }: { url: string; note?: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="meiji-card flex h-full min-h-40 flex-col items-center justify-center gap-2 p-6 text-center transition-transform hover:-translate-y-1"
    >
      <span className="text-3xl">🐦</span>
      <span className="font-extrabold" style={{ color: 'var(--m-ink)' }}>
        {note || 'A moment from Meiji'}
      </span>
      <span
        className="text-sm font-bold"
        style={{ color: 'var(--m-lavender-deep)' }}
      >
        View on X →
      </span>
    </a>
  )
}

// Fetch the tweet ourselves so a failed request degrades to a fallback instead
// of throwing into the RSC stream (which crashes the dev error overlay).
async function SafeTweet({
  id,
  url,
  note
}: {
  id: string
  url: string
  note?: string
}) {
  let tweet
  try {
    // Time-box the fetch: if Twitter's CDN is unreachable the request would
    // otherwise hang and the Suspense boundary would stay stuck on the
    // skeleton, never reaching this fallback.
    tweet = await getTweet(id, { signal: AbortSignal.timeout(4000) })
  } catch {
    tweet = undefined
  }
  return tweet ? (
    <EmbeddedTweet tweet={tweet} />
  ) : (
    <TweetFallback url={url} note={note} />
  )
}

export function MeijiFeaturedTweets({ tweets }: { tweets: FeaturedTweet[] }) {
  const items: { id: string; url: string; note?: string }[] = []
  for (const t of tweets) {
    const id = parseTweetId(t.url)
    if (id) items.push({ id, url: t.url, note: t.note })
  }

  // Hide the whole section until there's at least one valid tweet.
  if (items.length === 0) return null

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <h2
        className="meiji-display mb-8 text-center text-4xl sm:text-5xl"
        style={{ color: 'var(--m-ink)' }}
      >
        Big Days <span style={{ color: 'var(--m-lavender-deep)' }}>✨</span>
      </h2>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((t, i) => (
          <MeijiReveal key={t.id} delay={(i % 3) * 0.08}>
            {t.note && (
              <p
                className="mb-2 px-1 text-sm font-extrabold"
                style={{ color: 'var(--m-ink-soft)' }}
              >
                {t.note}
              </p>
            )}
            <Suspense fallback={<TweetSkeleton />}>
              <SafeTweet id={t.id} url={t.url} note={t.note} />
            </Suspense>
          </MeijiReveal>
        ))}
      </div>
    </section>
  )
}
