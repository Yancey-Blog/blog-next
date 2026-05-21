'use client'

import { motion } from 'framer-motion'

/** A soft paw-print glyph used as a floating decoration. */
function Paw({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 64 64" className={className} style={style} aria-hidden>
      <g fill="currentColor">
        <ellipse cx="32" cy="42" rx="16" ry="13" />
        <ellipse cx="13" cy="28" rx="6.5" ry="8.5" />
        <ellipse cx="25" cy="18" rx="6.5" ry="9" />
        <ellipse cx="39" cy="18" rx="6.5" ry="9" />
        <ellipse cx="51" cy="28" rx="6.5" ry="8.5" />
      </g>
    </svg>
  )
}

const BLOBS = [
  { top: '8%', left: '6%', size: 120, color: 'var(--m-lavender-deep)', dur: 7, r: '-12deg' },
  { top: '22%', right: '8%', size: 86, color: 'var(--m-mint-deep)', dur: 9, r: '14deg' },
  { top: '64%', left: '4%', size: 70, color: 'var(--m-gold-soft)', dur: 8, r: '8deg' },
  { top: '78%', right: '10%', size: 110, color: 'var(--m-pink)', dur: 10, r: '-10deg' }
]

/** Floating pastel paw-prints + a slow-spinning sunburst for atmosphere. */
export function MeijiBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {BLOBS.map((b, i) => (
        <motion.div
          key={i}
          className="meiji-deco"
          style={{
            top: b.top,
            left: b.left,
            right: b.right,
            width: b.size,
            height: b.size,
            color: b.color,
            // @ts-expect-error custom prop for keyframe rotation
            '--r': b.r,
            animation: `m-float ${b.dur}s ease-in-out infinite`
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.55, scale: 1 }}
          transition={{ type: 'spring', stiffness: 90, damping: 12, delay: 0.2 + i * 0.12 }}
        >
          <Paw className="h-full w-full" />
        </motion.div>
      ))}

      {/* faint rotating sunburst, top-center */}
      <div
        className="meiji-deco"
        style={{
          top: '-180px',
          left: '50%',
          marginLeft: '-200px',
          width: 400,
          height: 400,
          opacity: 0.12,
          color: 'var(--m-gold)',
          animation: 'm-spin-slow 60s linear infinite'
        }}
      >
        <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
          {Array.from({ length: 24 }).map((_, i) => (
            <rect
              key={i}
              x="49"
              y="0"
              width="2"
              height="50"
              fill="currentColor"
              transform={`rotate(${i * 15} 50 50)`}
            />
          ))}
        </svg>
      </div>
    </div>
  )
}
