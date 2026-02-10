'use client'

import Link from 'next/link'
import { ThemeModeSwitcher } from './theme-mode-switcher'

export function FrontendFooter() {
  const currentYear = new Date().getFullYear()

  // TODO: Make releasePostId configurable from settings
  const releasePostId = 'release-notes' // Placeholder

  return (
    <footer className="border-t bg-background py-12">
      <div className="container mx-auto px-4">
        {/* Main footer content */}
        <div className="flex flex-col items-center space-y-6">
          {/* Theme Switcher */}
          <ThemeModeSwitcher />

          {/* Crafted with love */}
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            Crafted with{' '}
            <svg
              className="inline-block h-4 w-4 fill-red-500 text-red-500"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>{' '}
            by Yancey
          </p>

          {/* Divider */}
          <div className="h-px w-full max-w-md bg-border" />

          {/* Footer Bottom */}
          <div className="flex flex-col items-center space-y-4">
            {/* Copyright */}
            <p className="text-center text-sm text-muted-foreground">
              Copyright &copy; {currentYear} Yancey Inc. and its affiliates.
            </p>

            {/* Links */}
            <nav className="flex flex-wrap items-center justify-center gap-6 text-sm">
              <Link
                href={`/post/${releasePostId}`}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Chronicle of Events
              </Link>
              <Link
                href="/legal/privacy-policy"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Privacy Policy
              </Link>
              <a
                href="mailto:yanceyofficial@gmail.com"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Contact Me
              </a>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  )
}
