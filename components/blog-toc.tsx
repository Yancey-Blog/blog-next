'use client'

import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { FluidToc, type TocItem } from 'react-fluid-toc'

interface BlogTocProps {
  /** Headings extracted on the server (see lib/blocknote/extract-toc). */
  items?: TocItem[]
}

// Fixed header height the smooth-scroll target should clear.
const SCROLL_OFFSET = 96

// Map react-fluid-toc's theme variables onto the blog's OKLCH design tokens,
// and make the outline its own scroll container (so its auto-scroll works).
const tocStyle = {
  maxHeight: 'calc(100vh - 10rem)',
  overflowY: 'auto',
  '--fluid-toc-rail': 'var(--border)',
  '--fluid-toc-accent': 'var(--primary)',
  '--fluid-toc-muted': 'var(--muted-foreground)',
  '--fluid-toc-active': 'var(--primary)'
} as CSSProperties

export function BlogToc({ items }: BlogTocProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!items || items.length === 0) return null

  return (
    <>
      {/* Mobile TOC toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed right-4 top-20 z-40 rounded-lg border border-border bg-card p-3 shadow-lg transition-colors hover:bg-accent xl:hidden"
        aria-label="Toggle Table of Contents"
      >
        <ChevronRight
          className={cn('h-5 w-5 transition-transform', isOpen && 'rotate-90')}
        />
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm xl:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed right-4 top-24 z-40 w-64 p-4',
          // Mobile drawer keeps a surface; desktop is borderless like the docs layout.
          'rounded-lg border border-border bg-card shadow-lg',
          'xl:rounded-none xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none',
          // Desktop: sticky inside the content column so it releases before the footer.
          'xl:sticky xl:right-auto xl:top-24 xl:z-auto xl:self-start',
          'hidden transition-transform duration-300 xl:block',
          isOpen
            ? 'block translate-x-0'
            : 'translate-x-[calc(100%+1rem)] xl:translate-x-0'
        )}
      >
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground">
          On this page
        </h3>

        {/* Clicking an entry closes the mobile drawer; FluidToc still scrolls. */}
        <div
          onClick={(e) =>
            (e.target as HTMLElement).closest('a') && setIsOpen(false)
          }
        >
          <FluidToc
            items={items}
            scrollOffset={SCROLL_OFFSET}
            className="no-scrollbar"
            style={tocStyle}
          />
        </div>
      </aside>
    </>
  )
}
