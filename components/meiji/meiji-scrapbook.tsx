'use client'

import { LazyLoadImage } from '@/components/lazy-load-image'
import type { ScrapbookItem } from '@/lib/validations/meiji'
import { motion, useScroll, useTransform } from 'framer-motion'

interface Slot {
  pos: React.CSSProperties // left/right + top
  rotate: number
  depth: number // parallax travel on scroll (px)
  bg: string
  emoji: string // fallback when no photo is configured
  caption: string // default caption
}

// Fixed layout for the 6 scrapbook slots. Only the photo + caption of each
// slot is editable from the admin; the scatter/rotation/parallax stay preset.
const LAYOUT: Slot[] = [
  { pos: { left: '2%', top: '16%' }, rotate: -8, depth: 90, bg: 'linear-gradient(140deg, var(--m-lavender), var(--m-lavender-deep))', emoji: '😺', caption: 'day one 🐾' },
  { pos: { left: '6%', top: '54%' }, rotate: 6, depth: -70, bg: 'linear-gradient(140deg, var(--m-mint), var(--m-mint-deep))', emoji: '😸', caption: 'nap o’clock' },
  { pos: { left: '13%', top: '34%' }, rotate: -3, depth: 140, bg: 'linear-gradient(140deg, var(--m-peach), var(--m-gold-soft))', emoji: '🐾', caption: 'tiny beans' },
  { pos: { right: '3%', top: '20%' }, rotate: 9, depth: -110, bg: 'linear-gradient(140deg, var(--m-pink), var(--m-gold-soft))', emoji: '😻', caption: 'so smol' },
  { pos: { right: '8%', top: '58%' }, rotate: -7, depth: 100, bg: 'linear-gradient(140deg, var(--m-lavender), var(--m-mint))', emoji: '🐈', caption: 'mlem' },
  { pos: { right: '14%', top: '36%' }, rotate: 4, depth: -60, bg: 'linear-gradient(140deg, var(--m-gold-soft), var(--m-peach))', emoji: '🐱', caption: 'hello!' }
]

function Polaroid({
  slot,
  item,
  index
}: {
  slot: Slot
  item?: ScrapbookItem
  index: number
}) {
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 700], [0, slot.depth])
  const imageUrl = item?.imageUrl?.trim()
  const caption = item?.caption?.trim() || slot.caption

  return (
    <motion.div
      className="absolute hidden w-32 lg:block xl:w-36"
      style={{ ...slot.pos, y }}
      initial={{ opacity: 0, scale: 0.6, rotate: slot.rotate - 10 }}
      animate={{ opacity: 1, scale: 1, rotate: slot.rotate }}
      transition={{
        type: 'spring',
        stiffness: 80,
        damping: 11,
        delay: 0.5 + index * 0.08
      }}
    >
      <motion.div
        className="rounded-[6px] bg-white p-2 pb-7"
        style={{ boxShadow: '0 18px 36px -16px rgba(75,63,87,0.5)' }}
        animate={{ y: [0, -10, 0] }}
        transition={{
          duration: 5 + index * 0.4,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      >
        <span
          className="absolute left-1/2 top-0 h-4 w-12 -translate-x-1/2 -translate-y-1/2 -rotate-3 opacity-70"
          style={{ background: 'var(--m-gold-soft)' }}
        />
        {imageUrl ? (
          <div className="relative aspect-square overflow-hidden rounded-[3px]">
            <LazyLoadImage src={imageUrl} alt={caption} fill />
          </div>
        ) : (
          <div
            className="grid aspect-square place-items-center rounded-[3px] text-5xl"
            style={{ background: slot.bg }}
          >
            {slot.emoji}
          </div>
        )}
        <p
          className="mt-2 text-center text-sm font-bold"
          style={{ color: 'var(--m-ink-soft)' }}
        >
          {caption}
        </p>
      </motion.div>
    </motion.div>
  )
}

/** Scattered, scroll-parallaxed photos framing the hero (admin-configurable). */
export function MeijiScrapbook({ items }: { items?: ScrapbookItem[] }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
      {LAYOUT.map((slot, i) => (
        <Polaroid key={i} slot={slot} item={items?.[i]} index={i} />
      ))}
    </div>
  )
}
