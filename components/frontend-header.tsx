import Link from 'next/link'
import { ThemeModeSwitcher } from './theme-mode-switcher'

export function FrontendHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center space-x-2 font-bold text-xl"
          >
            <span>Blog</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link
              href="/"
              className="text-foreground/60 transition-colors hover:text-foreground"
            >
              Home
            </Link>
            <Link
              href="/about"
              className="text-foreground/60 transition-colors hover:text-foreground"
            >
              About
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeModeSwitcher />
        </div>
      </div>
    </header>
  )
}
