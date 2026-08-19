'use client'

import { formatDistanceToNow } from 'date-fns'
import { motion } from 'framer-motion'
import { Expand } from 'lucide-react'
import { useState } from 'react'

import { LazyLoadImage } from '@/components/lazy-load-image'
import type { MeijiMedia } from '@/lib/db/schema'

import { MeijiMediaLightbox } from './meiji-media-lightbox'
import { MeijiVideo } from './meiji-video'
import { MeijiVideoProvider, useMeijiVideo } from './meiji-video-provider'

const MILESTONE_STYLE: Record<string, { bg: string; emoji: string }> = {
  birthday: { bg: 'var(--m-peach)', emoji: '🎂' },
  vaccine: { bg: 'var(--m-mint)', emoji: '💉' },
  default: { bg: 'var(--m-lavender)', emoji: '⭐' }
}

function MilestoneBadge({ tag }: { tag: string }) {
  const s = MILESTONE_STYLE[tag] ?? MILESTONE_STYLE.default
  return (
    <span
      className="meiji-pill absolute top-3 left-3 z-10 px-3 py-1 text-xs font-extrabold capitalize"
      style={{ background: s.bg, color: 'var(--m-ink)' }}
    >
      {s.emoji} {tag}
    </span>
  )
}

function MediaCard({
  item,
  index,
  onZoom
}: {
  item: MeijiMedia
  index: number
  onZoom: () => void
}) {
  return (
    <motion.figure
      className="meiji-card group relative overflow-hidden p-0"
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{
        type: 'spring',
        stiffness: 120,
        damping: 16,
        delay: (index % 6) * 0.06
      }}
      whileHover={{ y: -6, rotate: index % 2 ? 1.2 : -1.2 }}
    >
      {item.milestone && <MilestoneBadge tag={item.milestone} />}

      {/* Zoom affordance — works for both photos and videos (videos keep their
          own controls, so this button is how you enlarge them). */}
      <button
        type="button"
        onClick={onZoom}
        aria-label="Zoom in"
        className="meiji-pill absolute top-3 right-3 z-20 border-2 border-white p-2 opacity-0 shadow-md transition-opacity group-hover:opacity-100"
        style={{ background: 'var(--m-white)', color: 'var(--m-ink)' }}
      >
        <Expand className="h-4 w-4" />
      </button>

      <div className="relative aspect-4/5 w-full overflow-hidden">
        {item.type === 'video' ? (
          <MeijiVideo
            src={item.url}
            containerClassName="absolute inset-0 h-full w-full"
            videoClassName="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          // Clicking a photo enlarges it; videos use the zoom button instead so
          // their playback controls stay clickable.
          <button
            type="button"
            onClick={onZoom}
            aria-label="Zoom in"
            className="absolute inset-0 h-full w-full cursor-zoom-in"
          >
            <LazyLoadImage
              src={item.url}
              alt={item.caption ?? 'Meiji'}
              fill
              className="transition-transform duration-500 group-hover:scale-105"
            />
          </button>
        )}
      </div>

      <figcaption className="px-4 py-3">
        {item.caption && (
          <p className="text-sm font-bold" style={{ color: 'var(--m-ink)' }}>
            {item.caption}
          </p>
        )}
        <p className="text-xs font-bold" style={{ color: 'var(--m-ink-soft)' }}>
          {formatDistanceToNow(new Date(item.takenAt), { addSuffix: true })}
        </p>
      </figcaption>
    </motion.figure>
  )
}

function EmptyState() {
  return (
    <div className="meiji-card mx-auto max-w-md px-8 py-14 text-center">
      <motion.div
        className="text-6xl"
        animate={{ rotate: [0, -8, 8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        🐱
      </motion.div>
      <p
        className="mt-4 text-lg font-extrabold"
        style={{ color: 'var(--m-ink)' }}
      >
        No photos yet!
      </p>
      <p
        className="mt-1 text-sm font-bold"
        style={{ color: 'var(--m-ink-soft)' }}
      >
        Meiji is busy being adorable. Check back soon 🐾
      </p>
    </div>
  )
}

export function MeijiMediaFeed({ media }: { media: MeijiMedia[] }) {
  const [zoomIndex, setZoomIndex] = useState<number | null>(null)

  return (
    <MeijiVideoProvider>
      <FeedContent media={media} onZoom={setZoomIndex} />
      <MeijiMediaLightbox
        media={media}
        startIndex={zoomIndex}
        onClose={() => setZoomIndex(null)}
      />
    </MeijiVideoProvider>
  )
}

// Split out so the zoom button can pause any inline video (via useMeijiVideo)
// before opening the lightbox — the hook must run under the provider.
function FeedContent({
  media,
  onZoom
}: {
  media: MeijiMedia[]
  onZoom: (index: number) => void
}) {
  const { pauseActive } = useMeijiVideo()

  const openZoom = (index: number) => {
    pauseActive()
    onZoom(index)
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <motion.h2
        className="meiji-display mb-8 text-center text-4xl sm:text-5xl"
        style={{ color: 'var(--m-ink)' }}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 120, damping: 16 }}
      >
        Daily Meiji <span style={{ color: 'var(--m-gold)' }}>🐾</span>
      </motion.h2>

      {media.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {media.map((item, i) => (
            <MediaCard
              key={item.id}
              item={item}
              index={i}
              onZoom={() => openZoom(i)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
