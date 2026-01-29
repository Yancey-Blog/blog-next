'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'

/**
 * Theme mode provider using next-themes
 * Manages light/dark/system theme modes
 * Automatically syncs with system preferences and persists to localStorage
 */
export function ThemeModeProvider({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="blog-admin-theme-mode"
    >
      {children}
    </NextThemesProvider>
  )
}
