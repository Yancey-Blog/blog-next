'use client'

import { getThemeById, type ThemeConfig } from '@/lib/themes'
import { useEffect } from 'react'

interface ThemeProviderProps {
  themeId: string
}

export function ThemeProvider({ themeId }: ThemeProviderProps) {
  useEffect(() => {
    const theme = getThemeById(themeId)
    if (!theme) return

    // Apply theme CSS variables
    applyTheme(theme)
  }, [themeId])

  return null
}

function applyTheme(theme: ThemeConfig) {
  const root = document.documentElement

  // Apply light mode variables
  Object.entries(theme.cssVars.light).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })

  // Check if dark mode is active
  const isDark = root.classList.contains('dark')

  if (isDark) {
    Object.entries(theme.cssVars.dark).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })
  }

  // Listen for dark mode changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'class') {
        const isDark = root.classList.contains('dark')
        const vars = isDark ? theme.cssVars.dark : theme.cssVars.light

        Object.entries(vars).forEach(([key, value]) => {
          root.style.setProperty(key, value)
        })
      }
    })
  })

  observer.observe(root, {
    attributes: true,
    attributeFilter: ['class']
  })

  return () => observer.disconnect()
}
