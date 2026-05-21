'use client'

import type { MeijiMedia } from '@/lib/db/schema'
import { motion } from 'framer-motion'

const MILESTONE_STYLE: Record<string, { bg: string; emoji: string }> = {
  birthday: { bg: 'var(--m-peach)', emoji: '🎂' },
  vaccine: { bg: 'var(--m-mint)', emoji: '💉' },
  default: { bg: 'var(--m-lavender)', emoji: '⭐' }
}

function MilestoneBadge({ tag }: { tag: string }) {
  const s = MILESTONE_STYLE[tag] ?? MILESTONE_STYLE.default
  return (
    <span
      className="meiji-pill absolute left-3 top-3 z-10 px-3 py-1 text-xs font-extrabold capitalize"
      style={{ background: s.bg, color: 'var(--m-ink)' }}
    >
      {s.emoji} {tag}
    </span>
  )
}

function MediaCard({ item, index }: { item: MeijiMedia; index: number }) {
  return (
    <motion.figure
      className="meiji-card group relative mb-5 overflow-hidden p-0"
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ type: 'spring', stiffness: 120, damping: 16, delay: (index % 6) * 0.06 }}
      whileHover={{ y: -6, rotate: index % 2 ? 1.2 : -1.2 }}
    >
      {item.milestone && <MilestoneBadge tag={item.milestone} />}
      {item.type === 'video' ? (
        <video
          src={item.url}
          controls
          playsInline
          className="w-full rounded-[26px] object-cover"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.url}
          alt={item.caption ?? 'Meiji'}
          loading="lazy"
          className="w-full rounded-[26px] object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      )}
      {item.caption && (
        <figcaption
          className="px-4 py-3 text-sm font-bold"
          style={{ color: 'var(--m-ink)' }}
        >
          {item.caption}
        </figcaption>
      )}
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
      <p className="mt-4 text-lg font-extrabold" style={{ color: 'var(--m-ink)' }}>
        No photos yet!
      </p>
      <p className="mt-1 text-sm font-bold" style={{ color: 'var(--m-ink-soft)' }}>
        Meiji is busy being adorable. Check back soon 🐾
      </p>
    </div>
  )
}

export function MeijiMediaFeed({ media }: { media: MeijiMedia[] }) {
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
        <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">
          {media.map((item, i) => (
            <MediaCard key={item.id} item={item} index={i} />
          ))}
        </div>
      )}
    </section>
  )
}
