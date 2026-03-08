'use client'

import { useTheme } from 'next-themes'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

interface FrontendHeaderClientProps {
  children: React.ReactNode
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
          : 'backdrop-blur supports-backdrop-filter:bg-background/60 shadow-sm'
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
          </nav>
        </div>

        <div className="flex items-center gap-4">{children}</div>
      </div>
    </header>
  )
}
