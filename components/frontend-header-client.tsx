'use client'

import { useTheme } from 'next-themes'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

interface FrontendHeaderClientProps {
  children: React.ReactNode
}

// Canonical cat site in prod; the same-origin /meiji route works in dev.
const MEIJI_HREF =
  process.env.NODE_ENV === 'production'
    ? 'https://meiji.yanceyleo.com'
    : '/meiji'

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

  // Determine if dark mode (for logo selection)
  const isDark = resolvedTheme === 'dark'

  // Determine if header should be transparent
  const isTransparent = isHomepage && !isScrolled

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        isTransparent
          ? 'border-b-0 bg-transparent'
          : 'supports-backdrop-filter:bg-background/60 shadow-sm backdrop-blur'
      }`}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="relative top-0.5 flex items-center transition-opacity hover:opacity-80"
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
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <Link
              href="/"
              className={`transition-colors ${
                isTransparent
                  ? 'text-white/80 hover:text-white'
                  : 'text-foreground/60 hover:text-foreground'
              }`}
            >
              Home
            </Link>
            <Link
              href="/post"
              className={`transition-colors ${
                isTransparent
                  ? 'text-white/80 hover:text-white'
                  : 'text-foreground/60 hover:text-foreground'
              }`}
            >
              Articles
            </Link>
            <Link
              href="/post/7891c3aa-c292-4a3a-9e34-9434d69fe21d"
              className={`transition-colors ${
                isTransparent
                  ? 'text-white/80 hover:text-white'
                  : 'text-foreground/60 hover:text-foreground'
              }`}
            >
              About
            </Link>
            <Link
              href={MEIJI_HREF}
              className={`group flex items-center gap-1.5 transition-colors ${
                isTransparent
                  ? 'text-white/80 hover:text-white'
                  : 'text-foreground/60 hover:text-foreground'
              }`}
            >
              <PawIcon className="h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-125 group-hover:-rotate-12" />
              Meiji
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">{children}</div>
      </div>
    </header>
  )
}
