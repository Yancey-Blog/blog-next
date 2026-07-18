'use client'

import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface TocItem {
  id: string // Original heading id (used for anchor + scroll)
  text: string
  depth: number // 2 or 3
}

interface ComputedSvg {
  content: string // SVG path `d` for the rail / highlight line
  width: number
  height: number
  positions: [number, number][] // [top, bottom] per item, in list coordinates
}

interface BlogTocProps {
  content: string
  /**
   * Headings extracted on the server (see lib/blocknote/extract-toc). When
   * provided, the outline renders during SSR; otherwise it falls back to
   * client-side parsing of `content`.
   */
  items?: TocItem[]
}

// Horizontal offsets (px) mirror fumadocs' `default` TOC variant.
const getLineOffset = (depth: number) => (depth <= 2 ? 8 : 16)
const getItemOffset = (depth: number) => (depth <= 2 ? 20 : 32)

// Fixed header height the smooth-scroll target should clear.
const SCROLL_OFFSET = 96

export function BlogToc({ content, items }: BlogTocProps) {
  // Prefer server-extracted headings so the outline is present on first paint;
  // only fall back to client-side DOMParser when they are not supplied.
  const [toc, setToc] = useState<TocItem[]>(() => items ?? [])
  const [activeRange, setActiveRange] = useState<[number, number] | null>(null)
  const [svg, setSvg] = useState<ComputedSvg | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const listRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLElement>(null)
  // Tracks the previous active range so the travelling dot knows its direction.
  const prevRangeRef = useRef<{ start: number; end: number; isUp: boolean }>(
    null
  )

  useEffect(() => {
    // Fallback path only: when the server didn't supply `items`, parse the HTML
    // client-side (DOMParser is browser-only, so this can't run during SSR).
    if (items) return

    const parser = new DOMParser()
    const doc = parser.parseFromString(content, 'text/html')
    const headings = doc.querySelectorAll('h2[id], h3[id]')

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToc(
      Array.from(headings)
        .filter((heading) => heading.id)
        .map((heading) => ({
          id: heading.id,
          text: heading.textContent || '',
          depth: parseInt(heading.tagName.substring(1))
        }))
    )
  }, [content, items])

  // Build the SVG highlight path from the rendered anchor positions. Recomputed
  // whenever the list resizes (font load, reflow, viewport change).
  const computeSvg = useCallback(() => {
    const container = listRef.current
    if (!container || container.clientHeight === 0 || toc.length === 0) {
      setSvg(null)
      return
    }

    let width = 0
    let height = 0
    let d = ''
    const positions: [number, number][] = []

    toc.forEach((item, i) => {
      const el = container.querySelector<HTMLElement>(
        `a[data-toc-index="${i}"]`
      )
      if (!el) return

      const styles = getComputedStyle(el)
      const x = getLineOffset(item.depth) + 0.5
      const top = el.offsetTop + parseFloat(styles.paddingTop)
      const bottom =
        el.offsetTop + el.clientHeight - parseFloat(styles.paddingBottom)

      width = Math.max(x + 8, width)
      height = Math.max(height, bottom)

      if (i === 0) {
        d += `M${x} ${top} L${x} ${bottom}`
      } else {
        const upperBottom = positions[i - 1][1]
        const upperX = getLineOffset(toc[i - 1].depth) + 0.5
        // Bezier join between differing indent levels for a smooth rail.
        d += ` C ${upperX} ${top - 4} ${x} ${upperBottom + 4} ${x} ${top} L${x} ${bottom}`
      }

      positions.push([top, bottom])
    })

    setSvg({ content: d, width, height, positions })
  }, [toc])

  useEffect(() => {
    const container = listRef.current
    if (!container) return
    const observer = new ResizeObserver(computeSvg)
    observer.observe(container)
    // Compute initial geometry from the freshly-laid-out DOM.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    computeSvg()
    return () => observer.disconnect()
  }, [computeSvg])

  useEffect(() => {
    if (toc.length === 0) return

    const headings = toc
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null)

    const observer = new IntersectionObserver(
      () => {
        // Collect every heading currently within the active band, then keep the
        // spanning range so the highlight fills a section rather than a point.
        const visible: number[] = []
        toc.forEach((item, i) => {
          const el = document.getElementById(item.id)
          if (!el) return
          const rect = el.getBoundingClientRect()
          if (rect.top < SCROLL_OFFSET + 24 && rect.bottom > SCROLL_OFFSET)
            visible.push(i)
        })

        let range: [number, number]
        if (visible.length > 0) {
          range = [visible[0], visible[visible.length - 1]]
        } else {
          // Fallback: highlight the nearest heading above the fold so the
          // indicator never disappears between sections.
          let nearest = 0
          let min = Number.MAX_VALUE
          toc.forEach((item, i) => {
            const el = document.getElementById(item.id)
            if (!el) return
            const dist = Math.abs(
              el.getBoundingClientRect().top - SCROLL_OFFSET
            )
            if (dist < min) {
              min = dist
              nearest = i
            }
          })
          range = [nearest, nearest]
        }

        setActiveRange((prev) =>
          prev && prev[0] === range[0] && prev[1] === range[1] ? prev : range
        )
      },
      { rootMargin: '-80px 0px 0px 0px', threshold: [0, 1] }
    )

    headings.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [toc])

  // Drive the clip-path window + travelling dot via CSS variables written
  // straight to the DOM, avoiding a full re-render of the SVG on every scroll.
  useEffect(() => {
    const el = trackRef.current
    if (!el || !svg || !activeRange) return

    const [start, end] = activeRange
    const top = svg.positions[start]?.[0] ?? 0
    const bottom = svg.positions[end]?.[1] ?? 0

    const prev = prevRangeRef.current
    const isUp = prev
      ? prev.start > start ||
        prev.end > end ||
        (prev.start === start && prev.end === end && prev.isUp)
      : false
    prevRangeRef.current = { start, end, isUp }

    // Place the dot on the leading edge using real coordinates (same space as
    // the clip window), so it stays on the vertical line even across the curved
    // joins where path-length and Y-position diverge.
    const leadIdx = isUp ? start : end
    const dotX = getLineOffset(toc[leadIdx]?.depth ?? 2) + 0.5
    const dotY = isUp ? top : bottom

    el.style.setProperty('--track-top', `${top}px`)
    el.style.setProperty('--track-bottom', `${bottom}px`)
    el.style.setProperty('--dot-x', `${dotX}px`)
    el.style.setProperty('--dot-y', `${dotY}px`)

    // Keep the active item visible when the TOC itself overflows: scroll only
    // the aside container (never the window) to re-center the leading anchor.
    const container = scrollRef.current
    const anchor = listRef.current?.querySelector<HTMLElement>(
      `a[data-toc-index="${leadIdx}"]`
    )
    if (
      container &&
      anchor &&
      container.scrollHeight > container.clientHeight
    ) {
      const cRect = container.getBoundingClientRect()
      const aRect = anchor.getBoundingClientRect()
      if (aRect.top < cRect.top || aRect.bottom > cRect.bottom) {
        const delta =
          aRect.top -
          cRect.top -
          (container.clientHeight - anchor.clientHeight) / 2
        container.scrollTo({
          top: container.scrollTop + delta,
          behavior: 'smooth'
        })
      }
    }
  }, [svg, activeRange, toc])

  const handleClick = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const y = el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET
    window.scrollTo({ top: y, behavior: 'smooth' })
    setIsOpen(false)
  }

  if (toc.length === 0) return null

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
        ref={scrollRef}
        className={cn(
          'no-scrollbar fixed right-4 top-24 z-40 max-h-[calc(100vh-7rem)] w-64 overflow-y-auto overflow-x-hidden p-4',
          // Mobile drawer keeps a surface; desktop is borderless like the docs layout.
          'rounded-lg border border-border bg-card shadow-lg',
          'xl:rounded-none xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none',
          // Desktop: sticky inside the content column so it releases before the
          // footer instead of floating over it (fixed does), and scrolls its own
          // overflow when the outline is long.
          'xl:sticky xl:right-auto xl:top-24 xl:z-auto xl:self-start xl:max-h-[calc(100vh-8rem)]',
          'hidden transition-transform duration-300 xl:block',
          isOpen
            ? 'block translate-x-0'
            : 'translate-x-[calc(100%+1rem)] xl:translate-x-0'
        )}
      >
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground">
          On this page
        </h3>

        <nav ref={listRef} className="relative flex flex-col">
          {/* Animated highlight rail: full primary path revealed through a
              clip-path window that slides/grows with the active range. */}
          {svg && (
            <div
              ref={trackRef}
              className="pointer-events-none absolute left-0 top-0"
              style={{ width: svg.width, height: svg.height }}
            >
              {/* Continuous grey rail (one bezier path, smooth level joins). */}
              <svg
                width={svg.width}
                height={svg.height}
                viewBox={`0 0 ${svg.width} ${svg.height}`}
                className="absolute inset-0"
              >
                <path
                  d={svg.content}
                  className="stroke-border"
                  strokeWidth="1"
                  fill="none"
                />
              </svg>
              {/* Primary highlight, same path revealed through the clip window. */}
              <svg
                width={svg.width}
                height={svg.height}
                viewBox={`0 0 ${svg.width} ${svg.height}`}
                className="absolute inset-0 transition-[clip-path] duration-300 ease-out"
                style={{
                  clipPath:
                    'polygon(0 var(--track-top,0), 100% var(--track-top,0), 100% var(--track-bottom,0), 0 var(--track-bottom,0))'
                }}
              >
                <path
                  d={svg.content}
                  className="stroke-primary"
                  strokeWidth="1"
                  fill="none"
                />
              </svg>
              {/* Dot pinned to the leading edge of the highlight (real coords). */}
              <div
                className="absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary transition-[top,left] duration-300 ease-out"
                style={{
                  left: 'var(--dot-x, 0)',
                  top: 'var(--dot-y, 0)'
                }}
              />
            </div>
          )}

          {toc.map((item, i) => {
            const active =
              activeRange !== null && i >= activeRange[0] && i <= activeRange[1]
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                data-toc-index={i}
                data-active={active}
                onClick={(e) => {
                  e.preventDefault()
                  handleClick(item.id)
                }}
                style={{ paddingInlineStart: getItemOffset(item.depth) }}
                className={cn(
                  'relative block min-w-0 py-1.5 text-sm transition-colors [overflow-wrap:anywhere]',
                  'text-muted-foreground hover:text-foreground',
                  'data-[active=true]:font-medium data-[active=true]:text-primary'
                )}
              >
                {item.text}
              </a>
            )
          })}
        </nav>
      </aside>

      <style jsx>{`
        aside::-webkit-scrollbar {
          width: 4px;
        }
        aside::-webkit-scrollbar-track {
          background: transparent;
        }
        aside::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 2px;
        }
      `}</style>
    </>
  )
}
