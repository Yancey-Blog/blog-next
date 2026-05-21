import { parseTweetId, type FeaturedTweet } from '@/lib/validations/meiji'
import { Tweet } from 'react-tweet'

export function MeijiFeaturedTweets({ tweets }: { tweets: FeaturedTweet[] }) {
  const items: { id: string; note?: string }[] = []
  for (const t of tweets) {
    const id = parseTweetId(t.url)
    if (id) items.push({ id, note: t.note })
  }

  // Hide the whole section until there's at least one valid tweet.
  if (items.length === 0) return null

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <h2
        className="meiji-display mb-8 text-center text-4xl sm:text-5xl"
        style={{ color: 'var(--m-ink)' }}
      >
        Featured Tweets{' '}
        <span style={{ color: 'var(--m-lavender-deep)' }}>🐦</span>
      </h2>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((t) => (
          <div key={t.id} className="meiji-scroll-reveal">
            {t.note && (
              <p
                className="mb-2 px-1 text-sm font-extrabold"
                style={{ color: 'var(--m-ink-soft)' }}
              >
                {t.note}
              </p>
            )}
            {/* Canonical react-tweet usage: <Tweet> brings its own Suspense
                fallback and internally catches fetch errors -> TweetNotFound.
                Passing onError suppresses its console.error (which otherwise
                trips a Next dev-overlay bug); fetchOptions time-boxes the
                request so an unreachable CDN can't hang the skeleton. */}
            <Tweet
              id={t.id}
              onError={(err) => err}
              fetchOptions={{ signal: AbortSignal.timeout(5000) }}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
