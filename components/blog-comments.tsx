'use client'

import { DiscussionEmbed } from 'disqus-react'
import { useTheme } from 'next-themes'
import { useEffect, useRef, useState } from 'react'
import { Card } from './ui/card'

interface BlogCommentsProps {
  /** Stable, unique thread key — the blog id. Never reuse across posts. */
  identifier: string
  title: string
  /** Canonical absolute URL of the post. */
  url: string
}

// Minimal shape of the global Disqus API we call. `config` runs with `this`
// bound to the Disqus context, where `this.page` holds the thread identity.
interface DisqusApi {
  reset(options: {
    reload: boolean
    config: (this: {
      page: { identifier?: string; url?: string; title?: string }
    }) => void
  }): void
}

// Disqus site shortname. Overridable per-environment; falls back to the
// registered site so comments work out of the box.
const SHORTNAME = process.env.NEXT_PUBLIC_DISQUS_SHORTNAME || 'yancey-blog'

// Disqus' embed.js auto-detects its light/dark theme by reading the container's
// computed `color` / `background-color` and running them through its own
// parseColor(). Our theme tokens are OKLCH, which the browser serializes as
// `lab(...)` — a format Disqus' old parser can't read: it throws
// "parseColor received unparseable color: lab(...)", aborts loadEmbed(), and
// never mounts the comment iframe. We therefore wrap the embed in a surface with
// plain hex colors so detection succeeds (and picks the right light/dark theme).
const SURFACE = {
  light: { color: '#171717', backgroundColor: '#ffffff' },
  dark: { color: '#ededed', backgroundColor: '#0a0a0a' }
} as const

export function BlogComments({ identifier, title, url }: BlogCommentsProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  // The theme the embed currently shows, so we only reset on real changes.
  const appliedThemeRef = useRef<string>(null)

  // Gate the client-only embed to the second render to avoid a hydration
  // mismatch (resolvedTheme is unknown during SSR).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), [])

  // On theme change, ask Disqus to re-detect its scheme via the officially
  // recommended DISQUS.reset() instead of remounting the embed (which reloads
  // embed.js entirely). The surface hex colors below update in the same render,
  // so reset() reads the new scheme. The first resolved theme is only recorded —
  // DiscussionEmbed's own initial load already renders it.
  useEffect(() => {
    if (!resolvedTheme) return
    if (appliedThemeRef.current === null) {
      appliedThemeRef.current = resolvedTheme
      return
    }
    if (appliedThemeRef.current === resolvedTheme) return
    appliedThemeRef.current = resolvedTheme

    const disqus = (window as unknown as { DISQUS?: DisqusApi }).DISQUS
    disqus?.reset({
      reload: true,
      config() {
        this.page.identifier = identifier
        this.page.url = url
        this.page.title = title
      }
    })
  }, [resolvedTheme, identifier, url, title])

  // Wait for the resolved theme so the embed's initial load uses the right
  // surface (and thus the correct light/dark scheme) from the first paint.
  const ready = mounted && !!resolvedTheme
  const surface = resolvedTheme === 'dark' ? SURFACE.dark : SURFACE.light

  return (
    <Card className="mt-8 p-4 bg-transparent">
      {ready ? (
        // Hex surface gives Disqus parseable colors + the correct initial scheme.
        <div style={surface} className="rounded-lg">
          <DiscussionEmbed
            shortname={SHORTNAME}
            config={{ url, identifier, title }}
          />
        </div>
      ) : (
        // Placeholder keeps layout stable until the client-only embed mounts.
        <div
          className="h-40 animate-pulse rounded-lg bg-muted/50"
          aria-hidden
        />
      )}
    </Card>
  )
}
