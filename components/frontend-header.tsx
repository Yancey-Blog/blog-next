'use client'

import { useTheme } from 'next-themes'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AlgoliaSearch } from './algolia-search'

export function FrontendHeader() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme } = useTheme()
  const pathname = usePathname()

  // Only apply transparent effect on homepage
  const isHomepage = pathname === '/'

  useEffect(() => {
    // Initial scroll check
    setIsScrolled(window.scrollY > 10)
    setMounted(true)

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
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
            className="flex items-center transition-opacity hover:opacity-80 relative top-0.5"
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
          <nav className="hidden md:flex items-center gap-6 text-sm">
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
              href="/about"
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

        <div className="flex items-center gap-4">
          <AlgoliaSearch />
        </div>
      </div>
    </header>
  )
}
