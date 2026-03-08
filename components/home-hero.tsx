'use client'

import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import Link from 'next/link'
import CountUp from 'react-countup'
import { ParallaxHero } from './parallax-hero'

const DEFAULT_HERO_IMAGE =
  'https://static.yancey.app/ng9bwfv1-1728444113930.jpeg'
const STARTED_YEAR = 2018

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.13, delayChildren: 0.2 } }
}

const item = {
  hidden: { opacity: 0, y: 36 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: [0.25, 0.46, 0.45, 0.94] as const }
  }
}

export function HomeHero({
  totalArticles,
  heroImage
}: {
  totalArticles: number
  heroImage?: string | null
}) {
  const years = new Date().getFullYear() - STARTED_YEAR

  return (
    <ParallaxHero imageUrl={heroImage ?? DEFAULT_HERO_IMAGE}>
      {/* Centered content */}
      <div className="container relative z-10 mx-auto px-4 text-center">
        <motion.div
          className="mx-auto max-w-4xl"
          variants={container}
          initial="hidden"
          animate="visible"
        >
          {/* Eyebrow */}
          <motion.span
            variants={item}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-[0.2em] text-white/70 backdrop-blur-sm"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
            SOFTWARE ENGINEER & MUSIC PRODUCER
          </motion.span>

          {/* Glitch title */}
          <motion.h1
            variants={item}
            className="glitch-text mb-6 text-6xl font-bold tracking-tight text-white md:text-8xl lg:text-9xl"
            data-text="HI, YANCEY!"
          >
            HI, YANCEY!
          </motion.h1>

          {/* Quote */}
          <motion.div variants={item} className="mb-12 space-y-1">
            <p className="text-xl font-medium text-white/90 md:text-2xl">
              死は生の対極としてではなく、その一部として存在している。
            </p>
            <p className="text-sm text-white/50">
              Death is not the opposite of life, but a part of it.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={item}
            className="mb-10 flex items-center justify-center gap-16"
          >
            {[
              { label: 'ARTICLES', value: totalArticles },
              { label: 'YEARS', value: years }
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="text-5xl font-bold tabular-nums text-white">
                  <CountUp end={value} duration={2.2} />
                </div>
                <div className="mt-1 text-xs tracking-[0.2em] text-white/50">
                  {label}
                </div>
              </div>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.div
            variants={item}
            className="flex items-center justify-center gap-3"
          >
            <Link
              href="/post"
              className="rounded-full bg-white px-7 py-2.5 text-sm font-semibold text-black transition-all duration-200 hover:scale-105 hover:shadow-[0_0_24px_rgba(255,255,255,0.3)]"
            >
              Read Articles
            </Link>
            <a
              href="https://github.com/YanceyOfficial"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/25 bg-white/10 px-7 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-white/20"
            >
              GitHub
            </a>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 flex flex-col items-center gap-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.6 }}
      >
        <span className="text-xs tracking-widest text-white/40">SCROLL</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown className="h-5 w-5 text-white/40" />
        </motion.div>
      </motion.div>
    </ParallaxHero>
  )
}
