export interface ThemeConfig {
  id: string
  name: string
  description: string
  cssVars: {
    light: Record<string, string>
    dark: Record<string, string>
  }
}

export const PRESET_THEMES: ThemeConfig[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'Clean and minimal gray theme',
    cssVars: {
      light: {
        '--background': 'oklch(1 0 0)',
        '--foreground': 'oklch(0.145 0 0)',
        '--card': 'oklch(1 0 0)',
        '--card-foreground': 'oklch(0.145 0 0)',
        '--popover': 'oklch(1 0 0)',
        '--popover-foreground': 'oklch(0.145 0 0)',
        '--primary': 'oklch(0.205 0 0)',
        '--primary-foreground': 'oklch(0.985 0 0)',
        '--secondary': 'oklch(0.97 0 0)',
        '--secondary-foreground': 'oklch(0.205 0 0)',
        '--muted': 'oklch(0.97 0 0)',
        '--muted-foreground': 'oklch(0.556 0 0)',
        '--accent': 'oklch(0.97 0 0)',
        '--accent-foreground': 'oklch(0.205 0 0)',
        '--destructive': 'oklch(0.577 0.245 27.325)',
        '--border': 'oklch(0.922 0 0)',
        '--input': 'oklch(0.922 0 0)',
        '--ring': 'oklch(0.708 0 0)',
        '--sidebar': 'oklch(0.985 0 0)',
        '--sidebar-foreground': 'oklch(0.145 0 0)',
        '--sidebar-border': 'oklch(0.922 0 0)',
        '--radius': '0.625rem'
      },
      dark: {
        '--background': 'oklch(0.145 0 0)',
        '--foreground': 'oklch(0.985 0 0)',
        '--card': 'oklch(0.205 0 0)',
        '--card-foreground': 'oklch(0.985 0 0)',
        '--popover': 'oklch(0.205 0 0)',
        '--popover-foreground': 'oklch(0.985 0 0)',
        '--primary': 'oklch(0.922 0 0)',
        '--primary-foreground': 'oklch(0.205 0 0)',
        '--secondary': 'oklch(0.269 0 0)',
        '--secondary-foreground': 'oklch(0.985 0 0)',
        '--muted': 'oklch(0.269 0 0)',
        '--muted-foreground': 'oklch(0.708 0 0)',
        '--accent': 'oklch(0.269 0 0)',
        '--accent-foreground': 'oklch(0.985 0 0)',
        '--destructive': 'oklch(0.704 0.191 22.216)',
        '--border': 'oklch(1 0 0 / 10%)',
        '--input': 'oklch(1 0 0 / 15%)',
        '--ring': 'oklch(0.556 0 0)',
        '--sidebar': 'oklch(0.205 0 0)',
        '--sidebar-foreground': 'oklch(0.985 0 0)',
        '--sidebar-border': 'oklch(1 0 0 / 10%)',
        '--radius': '0.625rem'
      }
    }
  },
  {
    id: 'neo-brutalism',
    name: 'Neo Brutalism',
    description: 'Bold and edgy with hard shadows',
    cssVars: {
      light: {
        '--background': 'oklch(1.0000 0 0)',
        '--foreground': 'oklch(0 0 0)',
        '--card': 'oklch(1.0000 0 0)',
        '--card-foreground': 'oklch(0 0 0)',
        '--popover': 'oklch(1.0000 0 0)',
        '--popover-foreground': 'oklch(0 0 0)',
        '--primary': 'oklch(0.6489 0.2370 26.9728)',
        '--primary-foreground': 'oklch(1.0000 0 0)',
        '--secondary': 'oklch(0.9680 0.2110 109.7692)',
        '--secondary-foreground': 'oklch(0 0 0)',
        '--muted': 'oklch(0.9551 0 0)',
        '--muted-foreground': 'oklch(0.3211 0 0)',
        '--accent': 'oklch(0.5635 0.2408 260.8178)',
        '--accent-foreground': 'oklch(1.0000 0 0)',
        '--destructive': 'oklch(0 0 0)',
        '--destructive-foreground': 'oklch(1.0000 0 0)',
        '--border': 'oklch(0 0 0)',
        '--input': 'oklch(0 0 0)',
        '--ring': 'oklch(0.6489 0.2370 26.9728)',
        '--sidebar': 'oklch(0.9551 0 0)',
        '--sidebar-foreground': 'oklch(0 0 0)',
        '--sidebar-border': 'oklch(0 0 0)',
        '--radius': '0px'
      },
      dark: {
        '--background': 'oklch(0 0 0)',
        '--foreground': 'oklch(1.0000 0 0)',
        '--card': 'oklch(0.3211 0 0)',
        '--card-foreground': 'oklch(1.0000 0 0)',
        '--popover': 'oklch(0.3211 0 0)',
        '--popover-foreground': 'oklch(1.0000 0 0)',
        '--primary': 'oklch(0.7044 0.1872 23.1858)',
        '--primary-foreground': 'oklch(0 0 0)',
        '--secondary': 'oklch(0.9691 0.2005 109.6228)',
        '--secondary-foreground': 'oklch(0 0 0)',
        '--muted': 'oklch(0.2178 0 0)',
        '--muted-foreground': 'oklch(0.8452 0 0)',
        '--accent': 'oklch(0.6755 0.1765 252.2592)',
        '--accent-foreground': 'oklch(0 0 0)',
        '--destructive': 'oklch(1.0000 0 0)',
        '--destructive-foreground': 'oklch(0 0 0)',
        '--border': 'oklch(1.0000 0 0)',
        '--input': 'oklch(1.0000 0 0)',
        '--ring': 'oklch(0.7044 0.1872 23.1858)',
        '--sidebar': 'oklch(0 0 0)',
        '--sidebar-foreground': 'oklch(1.0000 0 0)',
        '--sidebar-border': 'oklch(1.0000 0 0)',
        '--radius': '0px'
      }
    }
  },
  {
    id: 'vibrant-purple',
    name: 'Vibrant Purple',
    description: 'Energetic purple and blue theme',
    cssVars: {
      light: {
        '--background': 'oklch(0.99 0.005 260)',
        '--foreground': 'oklch(0.2 0.02 260)',
        '--card': 'oklch(1 0 0)',
        '--card-foreground': 'oklch(0.2 0.02 260)',
        '--popover': 'oklch(1 0 0)',
        '--popover-foreground': 'oklch(0.2 0.02 260)',
        '--primary': 'oklch(0.55 0.25 260)',
        '--primary-foreground': 'oklch(0.99 0 0)',
        '--secondary': 'oklch(0.92 0.08 260)',
        '--secondary-foreground': 'oklch(0.3 0.1 260)',
        '--muted': 'oklch(0.95 0.02 260)',
        '--muted-foreground': 'oklch(0.5 0.05 260)',
        '--accent': 'oklch(0.88 0.12 200)',
        '--accent-foreground': 'oklch(0.25 0.1 200)',
        '--destructive': 'oklch(0.6 0.25 25)',
        '--border': 'oklch(0.88 0.04 260)',
        '--input': 'oklch(0.92 0.04 260)',
        '--ring': 'oklch(0.55 0.25 260)',
        '--sidebar': 'oklch(0.98 0.01 260)',
        '--sidebar-foreground': 'oklch(0.3 0.05 260)',
        '--sidebar-border': 'oklch(0.9 0.03 260)',
        '--radius': '0.625rem'
      },
      dark: {
        '--background': 'oklch(0.18 0.04 260)',
        '--foreground': 'oklch(0.95 0.02 260)',
        '--card': 'oklch(0.22 0.04 260)',
        '--card-foreground': 'oklch(0.95 0.02 260)',
        '--popover': 'oklch(0.22 0.04 260)',
        '--popover-foreground': 'oklch(0.95 0.02 260)',
        '--primary': 'oklch(0.7 0.25 260)',
        '--primary-foreground': 'oklch(0.15 0.04 260)',
        '--secondary': 'oklch(0.3 0.08 260)',
        '--secondary-foreground': 'oklch(0.9 0.05 260)',
        '--muted': 'oklch(0.28 0.04 260)',
        '--muted-foreground': 'oklch(0.65 0.06 260)',
        '--accent': 'oklch(0.4 0.15 200)',
        '--accent-foreground': 'oklch(0.95 0.02 200)',
        '--destructive': 'oklch(0.65 0.25 25)',
        '--border': 'oklch(0.35 0.06 260)',
        '--input': 'oklch(0.38 0.06 260)',
        '--ring': 'oklch(0.7 0.25 260)',
        '--sidebar': 'oklch(0.2 0.04 260)',
        '--sidebar-foreground': 'oklch(0.9 0.04 260)',
        '--sidebar-border': 'oklch(0.3 0.05 260)',
        '--radius': '0.625rem'
      }
    }
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    description: 'Cool and calming cyan-blue theme',
    cssVars: {
      light: {
        '--background': 'oklch(0.99 0.01 210)',
        '--foreground': 'oklch(0.2 0.03 210)',
        '--card': 'oklch(1 0 0)',
        '--card-foreground': 'oklch(0.2 0.03 210)',
        '--popover': 'oklch(1 0 0)',
        '--popover-foreground': 'oklch(0.2 0.03 210)',
        '--primary': 'oklch(0.5 0.2 210)',
        '--primary-foreground': 'oklch(0.99 0 0)',
        '--secondary': 'oklch(0.92 0.08 180)',
        '--secondary-foreground': 'oklch(0.3 0.1 180)',
        '--muted': 'oklch(0.96 0.02 210)',
        '--muted-foreground': 'oklch(0.5 0.05 210)',
        '--accent': 'oklch(0.85 0.15 180)',
        '--accent-foreground': 'oklch(0.2 0.1 180)',
        '--destructive': 'oklch(0.6 0.25 25)',
        '--border': 'oklch(0.9 0.04 210)',
        '--input': 'oklch(0.93 0.04 210)',
        '--ring': 'oklch(0.5 0.2 210)',
        '--sidebar': 'oklch(0.98 0.02 210)',
        '--sidebar-foreground': 'oklch(0.3 0.05 210)',
        '--sidebar-border': 'oklch(0.9 0.03 210)',
        '--radius': '0.75rem'
      },
      dark: {
        '--background': 'oklch(0.15 0.04 210)',
        '--foreground': 'oklch(0.95 0.02 210)',
        '--card': 'oklch(0.2 0.04 210)',
        '--card-foreground': 'oklch(0.95 0.02 210)',
        '--popover': 'oklch(0.2 0.04 210)',
        '--popover-foreground': 'oklch(0.95 0.02 210)',
        '--primary': 'oklch(0.65 0.22 210)',
        '--primary-foreground': 'oklch(0.15 0.04 210)',
        '--secondary': 'oklch(0.28 0.08 180)',
        '--secondary-foreground': 'oklch(0.9 0.05 180)',
        '--muted': 'oklch(0.25 0.04 210)',
        '--muted-foreground': 'oklch(0.6 0.06 210)',
        '--accent': 'oklch(0.45 0.18 180)',
        '--accent-foreground': 'oklch(0.95 0.02 180)',
        '--destructive': 'oklch(0.65 0.25 25)',
        '--border': 'oklch(0.32 0.06 210)',
        '--input': 'oklch(0.35 0.06 210)',
        '--ring': 'oklch(0.65 0.22 210)',
        '--sidebar': 'oklch(0.18 0.04 210)',
        '--sidebar-foreground': 'oklch(0.9 0.04 210)',
        '--sidebar-border': 'oklch(0.28 0.05 210)',
        '--radius': '0.75rem'
      }
    }
  },
  {
    id: 'sunset-glow',
    name: 'Sunset Glow',
    description: 'Warm orange and pink sunset vibes',
    cssVars: {
      light: {
        '--background': 'oklch(0.99 0.01 40)',
        '--foreground': 'oklch(0.2 0.03 40)',
        '--card': 'oklch(1 0 0)',
        '--card-foreground': 'oklch(0.2 0.03 40)',
        '--popover': 'oklch(1 0 0)',
        '--popover-foreground': 'oklch(0.2 0.03 40)',
        '--primary': 'oklch(0.6 0.24 30)',
        '--primary-foreground': 'oklch(0.99 0 0)',
        '--secondary': 'oklch(0.88 0.12 50)',
        '--secondary-foreground': 'oklch(0.3 0.1 50)',
        '--muted': 'oklch(0.96 0.02 40)',
        '--muted-foreground': 'oklch(0.5 0.05 40)',
        '--accent': 'oklch(0.75 0.2 350)',
        '--accent-foreground': 'oklch(0.99 0 0)',
        '--destructive': 'oklch(0.6 0.25 25)',
        '--border': 'oklch(0.9 0.04 40)',
        '--input': 'oklch(0.93 0.04 40)',
        '--ring': 'oklch(0.6 0.24 30)',
        '--sidebar': 'oklch(0.98 0.02 40)',
        '--sidebar-foreground': 'oklch(0.3 0.05 40)',
        '--sidebar-border': 'oklch(0.9 0.03 40)',
        '--radius': '0.875rem'
      },
      dark: {
        '--background': 'oklch(0.15 0.04 30)',
        '--foreground': 'oklch(0.95 0.02 30)',
        '--card': 'oklch(0.2 0.04 30)',
        '--card-foreground': 'oklch(0.95 0.02 30)',
        '--popover': 'oklch(0.2 0.04 30)',
        '--popover-foreground': 'oklch(0.95 0.02 30)',
        '--primary': 'oklch(0.68 0.22 30)',
        '--primary-foreground': 'oklch(0.15 0.04 30)',
        '--secondary': 'oklch(0.35 0.12 50)',
        '--secondary-foreground': 'oklch(0.9 0.05 50)',
        '--muted': 'oklch(0.25 0.04 30)',
        '--muted-foreground': 'oklch(0.6 0.06 30)',
        '--accent': 'oklch(0.55 0.18 350)',
        '--accent-foreground': 'oklch(0.95 0.02 350)',
        '--destructive': 'oklch(0.65 0.25 25)',
        '--border': 'oklch(0.32 0.06 30)',
        '--input': 'oklch(0.35 0.06 30)',
        '--ring': 'oklch(0.68 0.22 30)',
        '--sidebar': 'oklch(0.18 0.04 30)',
        '--sidebar-foreground': 'oklch(0.9 0.04 30)',
        '--sidebar-border': 'oklch(0.28 0.05 30)',
        '--radius': '0.875rem'
      }
    }
  }
]

export function getThemeById(id: string): ThemeConfig | undefined {
  return PRESET_THEMES.find((theme) => theme.id === id)
}

export function generateThemeCSS(theme: ThemeConfig): string {
  const lightVars = Object.entries(theme.cssVars.light)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n')

  const darkVars = Object.entries(theme.cssVars.dark)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n')

  return `:root {\n${lightVars}\n}\n\n.dark {\n${darkVars}\n}`
}
