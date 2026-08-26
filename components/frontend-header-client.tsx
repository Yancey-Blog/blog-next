'use client'

import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useLayoutEffect, useState } from 'react'

interface FrontendHeaderClientProps {
  children: React.ReactNode
}

// Canonical cat site in prod; the same-origin /meiji route works in dev.
const MEIJI_HREF =
  process.env.NODE_ENV === 'production'
    ? 'https://meiji.yanceyleo.com'
    : '/meiji'

// Shape (width/position/radius) animates immediately; background/border/
// shadow/blur follow with a delay. Scroll can jump straight from the floating
// pill to the top state in one event (fast flick, Home key, programmatic
// scroll), skipping every intermediate frame — so the two-stage look has to
// come from staggered transition timing, not from passing through more
// React states.
const HEADER_TRANSITION = [
  'width 320ms cubic-bezier(0.22,1,0.36,1)',
  'top 320ms cubic-bezier(0.22,1,0.36,1)'
].join(', ')

// Same shadow shape (layer count) in both states — only the alpha changes —
// so box-shadow can actually interpolate instead of snapping (browsers can't
// animate between shadow lists with a different number of layers).
const SHADOW_OFF = '0 1px 2px rgba(0,0,0,0), 0 16px 32px -12px rgba(0,0,0,0)'
const SHADOW_ON =
  '0 1px 2px rgba(0,0,0,0.06), 0 16px 32px -12px rgba(0,0,0,0.18)'

function PawIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <ellipse cx="32" cy="44" rx="15" ry="12" />
      <ellipse cx="14" cy="30" rx="6" ry="8" />
      <ellipse cx="26" cy="20" rx="6" ry="8.5" />
      <ellipse cx="38" cy="20" rx="6" ry="8.5" />
      <ellipse cx="50" cy="30" rx="6" ry="8" />
    </svg>
  )
}

export function FrontendHeaderClient({ children }: FrontendHeaderClientProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [suppressTransition, setSuppressTransition] = useState(false)
  const { resolvedTheme } = useTheme()
  const pathname = usePathname()

  // Only apply transparent effect on homepage
  const isHomepage = pathname === '/'

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    const handleMount = () => {
      setMounted(true)
      handleScroll()
    }

    // Use rAF to avoid synchronous setState in effect body
    const rafId = requestAnimationFrame(handleMount)

    window.addEventListener('scroll', handleScroll)
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // This component persists across client-side navigations (it lives in the
  // shared frontend layout), so `isScrolled` can still be `true` from the
  // previous page after a route change lands the new page at the top. Reset
  // it synchronously (before paint) on pathname change and skip the CSS
  // transition for that reset so the floating pill snaps instead of
  // animating back to the top bar.
  useLayoutEffect(() => {
    setSuppressTransition(true)
    setIsScrolled(false)
  }, [pathname])

  useEffect(() => {
    if (!suppressTransition) return
    const rafId = requestAnimationFrame(() => setSuppressTransition(false))
    return () => cancelAnimationFrame(rafId)
  }, [suppressTransition])

  // Determine if dark mode (for logo selection)
  const isDark = resolvedTheme === 'dark'

  // Determine if header should be transparent
  const isTransparent = isHomepage && !isScrolled

  const linkColorClass = isTransparent
    ? 'text-white/80 hover:text-white'
    : 'text-foreground/60 hover:text-foreground'

  // Framer Motion's layout animations run independently of the header's own
  // CSS transition, so `suppressTransition` must also zero out the spring
  // here — otherwise the logo still glides to its new position after a
  // route-change reset even though the header box itself snaps.
  const logoTransition = suppressTransition
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 380, damping: 34 }

  const logo = (
    <motion.div
      layoutId="site-logo"
      transition={logoTransition}
      className="relative top-0.5 flex items-center"
    >
      <Link
        href="/"
        className="flex items-center transition-opacity hover:opacity-80"
      >
        {mounted && (
          <Image
            src={
              isTransparent
                ? '/logo-dark.png' // White logo on transparent header
                : isDark
                  ? '/logo-dark.png'
                  : '/logo-light.png'
            }
            alt="Logo"
            width={120}
            height={40}
            className="h-8 w-auto"
            priority
          />
        )}
      </Link>
    </motion.div>
  )

  return (
    <header
      style={{
        transition: suppressTransition ? 'none' : HEADER_TRANSITION,
        boxShadow: isScrolled ? SHADOW_ON : SHADOW_OFF
      }}
      className={`fixed inset-x-0 z-50 mx-auto ${
        isScrolled
          ? 'supports-backdrop-filter:bg-background/70 top-4 w-[calc(100%-2rem)] max-w-5xl rounded-[28px] backdrop-blur'
          : isTransparent
            ? 'top-0 w-full rounded-none bg-transparent'
            : 'supports-backdrop-filter:bg-background/70 top-0 w-full rounded-none backdrop-blur'
      }`}
    >
      <div
        className={`relative container mx-auto flex items-center justify-between ${
          suppressTransition ? '' : 'transition-all duration-300'
        } ${isScrolled ? 'h-14 px-6' : 'h-16 px-4'}`}
      >
        <motion.div
          layout="position"
          transition={suppressTransition ? { duration: 0 } : undefined}
          className="flex items-center gap-6"
        >
          {!isScrolled && logo}
          <motion.nav
            layout="position"
            transition={suppressTransition ? { duration: 0 } : undefined}
            className="hidden items-center gap-6 text-sm md:flex"
          >
            <Link href="/" className={`transition-colors ${linkColorClass}`}>
              Home
            </Link>
            <Link
              href="/post"
              className={`transition-colors ${linkColorClass}`}
            >
              Articles
            </Link>
            <Link
              href="/post/7891c3aa-c292-4a3a-9e34-9434d69fe21d"
              className={`transition-colors ${linkColorClass}`}
            >
              About
            </Link>
            <Link
              href={MEIJI_HREF}
              className={`group flex items-center gap-1.5 transition-colors ${linkColorClass}`}
            >
              <PawIcon className="h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-125 group-hover:-rotate-12" />
              Meiji
            </Link>
          </motion.nav>
        </motion.div>

        {isScrolled && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="pointer-events-auto">{logo}</div>
          </div>
        )}

        <div className="flex items-center gap-4">{children}</div>
      </div>
    </header>
  )
}
