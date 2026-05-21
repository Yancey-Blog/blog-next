'use client'

import type { MeijiProfile } from '@/lib/validations/meiji'
import { motion, type Variants } from 'framer-motion'
import Image from 'next/image'

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } }
}
const item: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.92 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 140, damping: 14 }
  }
}

function formatBirthday(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function CatFace() {
  // Cute placeholder when no avatar is uploaded yet.
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
      <circle cx="100" cy="104" r="74" fill="var(--m-gold-soft)" />
      <path d="M44 64 L40 22 L78 50 Z" fill="var(--m-gold-soft)" />
      <path d="M156 64 L160 22 L122 50 Z" fill="var(--m-gold-soft)" />
      <circle cx="76" cy="98" r="9" fill="var(--m-ink)" />
      <circle cx="124" cy="98" r="9" fill="var(--m-ink)" />
      <circle cx="79" cy="95" r="3" fill="#fff" />
      <circle cx="127" cy="95" r="3" fill="#fff" />
      <path
        d="M92 120 q8 8 16 0"
        fill="none"
        stroke="var(--m-ink)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <ellipse cx="100" cy="114" rx="5" ry="3.5" fill="var(--m-pink)" />
      <circle cx="60" cy="118" r="9" fill="var(--m-pink)" opacity="0.6" />
      <circle cx="140" cy="118" r="9" fill="var(--m-pink)" opacity="0.6" />
    </svg>
  )
}

export function MeijiHero({ profile }: { profile: MeijiProfile }) {
  const facts = [
    { label: profile.gender, bg: 'var(--m-mint)' },
    { label: profile.breed, bg: 'var(--m-lavender)' },
    { label: `🎂 ${formatBirthday(profile.birthday)}`, bg: 'var(--m-peach)' }
  ].filter((f) => f.label)

  return (
    <section className="mx-auto flex min-h-[92dvh] max-w-6xl flex-col items-center justify-center px-6 pt-20 pb-10 text-center">
      <motion.div variants={container} initial="hidden" animate="show">
        {/* floating avatar */}
        <motion.div variants={item} className="mb-6 flex justify-center">
          <motion.div
            animate={{ y: [0, -14, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            className="meiji-card grid h-40 w-40 place-items-center overflow-hidden rounded-full p-0 sm:h-48 sm:w-48"
          >
            {profile.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt={profile.name}
                width={192}
                height={192}
                className="h-full w-full object-cover"
              />
            ) : (
              <CatFace />
            )}
          </motion.div>
        </motion.div>

        {/* big rounded wordmark */}
        <motion.h1
          variants={item}
          className="meiji-display text-[clamp(3.5rem,16vw,11rem)]"
          style={{
            color: 'var(--m-gold)',
            textShadow: '0 6px 0 rgba(255,255,255,0.9), 0 18px 30px rgba(243,177,58,0.28)'
          }}
        >
          MEIJI
        </motion.h1>

        {/* japanese name */}
        <motion.p
          variants={item}
          className="mt-1 text-2xl font-bold sm:text-3xl"
          style={{ color: 'var(--m-ink)' }}
        >
          {profile.name}
        </motion.p>

        {profile.bio && (
          <motion.p
            variants={item}
            className="mx-auto mt-4 max-w-xl text-base leading-relaxed sm:text-lg"
            style={{ color: 'var(--m-ink-soft)' }}
          >
            {profile.bio}
          </motion.p>
        )}

        {/* fact pills */}
        <motion.div
          variants={item}
          className="mt-7 flex flex-wrap items-center justify-center gap-2.5"
        >
          {facts.map((f) => (
            <span
              key={f.label}
              className="meiji-pill px-4 py-2 text-sm font-bold sm:text-base"
              style={{ background: f.bg, color: 'var(--m-ink)' }}
            >
              {f.label}
            </span>
          ))}
        </motion.div>

        {/* X / Twitter button */}
        {profile.xHandle && (
          <motion.div variants={item} className="mt-8">
            <a
              href={`https://x.com/${profile.xHandle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="meiji-pill inline-flex items-center gap-2 px-6 py-3 text-base font-extrabold text-white transition-transform hover:-translate-y-0.5 active:translate-y-0"
              style={{
                background: 'var(--m-ink)',
                boxShadow: '0 12px 24px -8px rgba(75,63,87,0.55)'
              }}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              @{profile.xHandle}
            </a>
          </motion.div>
        )}
      </motion.div>

      {/* scroll cue */}
      <motion.div
        className="mt-14 text-3xl"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden
      >
        🐾
      </motion.div>
    </section>
  )
}
