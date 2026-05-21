import { parseTweetId, type FeaturedTweet } from '@/lib/validations/meiji'
import { MeijiTweetCard } from './meiji-tweet-card'

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
          <div key={t.id} className="meiji-scroll-reveal" data-theme="light">
            {t.note && (
              <p
                className="mb-2 px-1 text-sm font-extrabold"
                style={{ color: 'var(--m-ink-soft)' }}
              >
                {t.note}
              </p>
            )}
            {/* Rendered client-side (SWR) on purpose — see MeijiTweetCard. */}
            <MeijiTweetCard id={t.id} url={t.url} />
          </div>
        ))}
      </div>
    </section>
  )
}
