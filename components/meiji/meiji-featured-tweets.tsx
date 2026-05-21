import { parseTweetId, type FeaturedTweet } from '@/lib/validations/meiji'
import { Tweet } from 'react-tweet'

/** Cute fallback shown when a tweet can't be loaded (deleted / offline / dev). */
function TweetFallback({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="meiji-card flex h-full min-h-40 flex-col items-center justify-center gap-2 p-6 text-center transition-transform hover:-translate-y-1"
    >
      <span className="text-3xl">🐦</span>
      <span
        className="text-sm font-bold"
        style={{ color: 'var(--m-lavender-deep)' }}
      >
        View this moment on X →
      </span>
    </a>
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
            {/* Canonical react-tweet usage: <Tweet> has its own Suspense
                fallback and internally catches fetch errors. `onError`
                suppresses the console.error that otherwise trips a Next
                dev-overlay crash (frame.join); `fetchOptions` time-boxes the
                request; and a custom `TweetNotFound` renders our cute fallback
                card (with a link to the tweet) on any failure. */}
            <Tweet
              id={t.id}
              onError={(err) => err}
              fetchOptions={{ signal: AbortSignal.timeout(5000) }}
              components={{ TweetNotFound: () => <TweetFallback url={t.url} /> }}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
