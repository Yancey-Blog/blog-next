'use client'

import { getThemeById } from '@/lib/themes'
import { useEffect } from 'react'

interface ThemeProviderProps {
  themeId: string
}

export function ThemeProvider({ themeId }: ThemeProviderProps) {
  useEffect(() => {
    const theme = getThemeById(themeId)
    if (!theme) return

    // Remove old theme style tag if exists
    const oldStyle = document.getElementById('theme-variables')
    if (oldStyle) {
      oldStyle.remove()
    }

    // Create and inject new style tag with theme CSS
    const style = document.createElement('style')
    style.id = 'theme-variables'
    style.textContent = theme.css
    document.head.appendChild(style)

    return () => {
      style.remove()
    }
  }, [themeId])

  return null
}
