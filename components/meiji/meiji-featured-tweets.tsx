import { parseTweetId, type FeaturedTweet } from '@/lib/validations/meiji'
import { Suspense } from 'react'
import { Tweet } from 'react-tweet'
import { MeijiReveal } from './meiji-reveal'

function TweetSkeleton() {
  return (
    <div
      className="meiji-card h-64 w-full animate-pulse"
      style={{ background: 'var(--m-cream-2)' }}
    />
  )
}

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
              <Tweet id={t.id} />
            </Suspense>
          </MeijiReveal>
        ))}
      </div>
    </section>
  )
}
