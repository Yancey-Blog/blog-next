'use client'

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

/**
 * Renders a tweet CLIENT-side (react-tweet's SWR variant). Doing the fetch in
 * the browser instead of in a server component avoids a Next 16 dev-mode bug:
 * a failed server-side fetch gets serialized to the client error overlay,
 * whose RSC Flight runtime then crashes reconstructing the stack
 * ("TypeError: frame.join is not a function"). A failed client fetch just
 * renders our custom TweetNotFound fallback.
 */
export function MeijiTweetCard({ id, url }: { id: string; url: string }) {
  return (
    <Tweet
      id={id}
      components={{ TweetNotFound: () => <TweetFallback url={url} /> }}
    />
  )
}
