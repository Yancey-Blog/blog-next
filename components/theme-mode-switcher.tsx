'use client'

import { LaptopIcon, MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from 'next-themes'

/**
 * Theme mode switcher component
 * Supports light, dark, and system theme modes
 * Persists selection in localStorage and respects system preferences
 */
export function ThemeModeSwitcher() {
  const { setTheme, theme, systemTheme } = useTheme()

  // Use system theme as fallback during SSR/hydration
  const currentTheme = theme || systemTheme || 'system'

  return (
    <div className="flex w-fit rounded-full bg-accent shadow-sm border">
      <span className="h-full">
        <input
          className="peer sr-only"
          type="radio"
          id="theme-switch-system"
          value="system"
          checked={currentTheme === 'system'}
          onChange={(e) => setTheme(e.target.value)}
        />
        <label
          htmlFor="theme-switch-system"
          className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground peer-checked:bg-background peer-checked:text-foreground peer-checked:shadow-sm"
          title="System theme"
        >
          <LaptopIcon className="h-4 w-4" />
        </label>
      </span>
      <span className="h-full">
        <input
          className="peer sr-only"
          type="radio"
          id="theme-switch-light"
          value="light"
          checked={currentTheme === 'light'}
          onChange={(e) => setTheme(e.target.value)}
        />
        <label
          htmlFor="theme-switch-light"
          className="relative flex h-[32px] w-[32px] cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground peer-checked:bg-background peer-checked:text-foreground peer-checked:shadow-sm"
          title="Light theme"
        >
          <SunIcon className="h-4 w-4" />
        </label>
      </span>
      <span className="h-full">
        <input
          className="peer sr-only"
          type="radio"
          id="theme-switch-dark"
          value="dark"
          checked={currentTheme === 'dark'}
          onChange={(e) => setTheme(e.target.value)}
        />
        <label
          htmlFor="theme-switch-dark"
          className="relative flex h-[32px] w-[32px] cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground peer-checked:bg-background peer-checked:text-foreground peer-checked:shadow-sm"
          title="Dark theme"
        >
          <MoonIcon className="h-4 w-4" />
        </label>
      </span>
    </div>
  )
}
