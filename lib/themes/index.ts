export { cosmicNightTheme } from './cosmic-night'
export { defaultTheme } from './default'
export { modernMinimalTheme } from './modern-minimal'
export { natureTheme } from './nature'
export { neoBrutalismTheme } from './neo-brutalism'
export { quantumRoseTheme } from './quantum-rose'
export type { ThemeConfig } from './types'

import { cosmicNightTheme } from './cosmic-night'
import { defaultTheme } from './default'
import { modernMinimalTheme } from './modern-minimal'
import { natureTheme } from './nature'
import { neoBrutalismTheme } from './neo-brutalism'
import { quantumRoseTheme } from './quantum-rose'
import type { ThemeConfig } from './types'

export const PRESET_THEMES: ThemeConfig[] = [
  defaultTheme,
  quantumRoseTheme,
  modernMinimalTheme,
  cosmicNightTheme,
  natureTheme,
  neoBrutalismTheme
]

export function getThemeById(id: string): ThemeConfig | undefined {
  return PRESET_THEMES.find((theme) => theme.id === id)
}
