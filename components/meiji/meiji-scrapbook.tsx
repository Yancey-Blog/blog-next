'use client'

import { motion, useScroll, useTransform } from 'framer-motion'

interface PolaroidData {
  pos: React.CSSProperties // left/right + top
  rotate: number
  depth: number // parallax travel on scroll (px)
  bg: string
  emoji: string
  caption: string
  delay: number
}

// Placeholder "scrapbook" photos around the hero. Self-contained (pastel
// gradient + emoji) so they always render; swap for real cutouts later.
const POLAROIDS: PolaroidData[] = [
  {
    pos: { left: '2%', top: '16%' },
    rotate: -8,
    depth: 90,
    bg: 'linear-gradient(140deg, var(--m-lavender), var(--m-lavender-deep))',
    emoji: '😺',
    caption: 'day one 🐾',
    delay: 0.5
  },
  {
    pos: { left: '6%', top: '54%' },
    rotate: 6,
    depth: -70,
    bg: 'linear-gradient(140deg, var(--m-mint), var(--m-mint-deep))',
    emoji: '😸',
    caption: 'nap o’clock',
    delay: 0.7
  },
  {
    pos: { left: '13%', top: '34%' },
    rotate: -3,
    depth: 140,
    bg: 'linear-gradient(140deg, var(--m-peach), var(--m-gold-soft))',
    emoji: '🐾',
    caption: 'tiny beans',
    delay: 0.9
  },
  {
    pos: { right: '3%', top: '20%' },
    rotate: 9,
    depth: -110,
    bg: 'linear-gradient(140deg, var(--m-pink), var(--m-gold-soft))',
    emoji: '😻',
    caption: 'so smol',
    delay: 0.6
  },
  {
    pos: { right: '8%', top: '58%' },
    rotate: -7,
    depth: 100,
    bg: 'linear-gradient(140deg, var(--m-lavender), var(--m-mint))',
    emoji: '🐈',
    caption: 'mlem',
    delay: 0.8
  },
  {
    pos: { right: '14%', top: '36%' },
    rotate: 4,
    depth: -60,
    bg: 'linear-gradient(140deg, var(--m-gold-soft), var(--m-peach))',
    emoji: '🐱',
    caption: 'hello!',
    delay: 1
  }
]

function Polaroid({ data }: { data: PolaroidData }) {
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 700], [0, data.depth])

  return (
    <motion.div
      className="absolute hidden w-32 lg:block xl:w-36"
      style={{ ...data.pos, y }}
      initial={{ opacity: 0, scale: 0.6, rotate: data.rotate - 10 }}
      animate={{ opacity: 1, scale: 1, rotate: data.rotate }}
      transition={{
        type: 'spring',
        stiffness: 80,
        damping: 11,
        delay: data.delay
      }}
    >
      <motion.div
        className="rounded-[6px] bg-white p-2 pb-7"
        style={{ boxShadow: '0 18px 36px -16px rgba(75,63,87,0.5)' }}
        animate={{ y: [0, -10, 0] }}
        transition={{
          duration: 5 + data.delay,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      >
        {/* washi tape */}
        <span
          className="absolute left-1/2 top-0 h-4 w-12 -translate-x-1/2 -translate-y-1/2 -rotate-3 opacity-70"
          style={{ background: 'var(--m-gold-soft)' }}
        />
        <div
          className="grid aspect-square place-items-center rounded-[3px] text-5xl"
          style={{ background: data.bg }}
        >
          {data.emoji}
        </div>
        <p
          className="mt-2 text-center text-sm font-bold"
          style={{ color: 'var(--m-ink-soft)' }}
        >
          {data.caption}
        </p>
      </motion.div>
    </motion.div>
  )
}

/** Scattered, scroll-parallaxed placeholder photos framing the hero. */
export function MeijiScrapbook() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
      {POLAROIDS.map((p, i) => (
        <Polaroid key={i} data={p} />
      ))}
    </div>
  )
}
