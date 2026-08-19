'use client'

import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { PRESET_THEMES } from '@/lib/themes'
import { useTRPC } from '@/lib/trpc/client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from './ui/card'

interface ThemeSettingsProps {
  currentTheme: string
}

// Helper function to extract CSS variable value from theme CSS string
function extractCSSVariable(css: string, varName: string): string {
  // Match :root section only (not .dark section)
  const rootMatch = css.match(/:root\s*{([^}]+)}/s)
  if (!rootMatch) return ''

  const rootContent = rootMatch[1]
  const regex = new RegExp(`${varName}:\\s*([^;]+);`, 'm')
  const match = rootContent.match(regex)
  return match ? match[1].trim() : ''
}

export function ThemeSettings({ currentTheme }: ThemeSettingsProps) {
  const [selectedTheme, setSelectedTheme] = useState(currentTheme)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const trpc = useTRPC()

  const updateTheme = useMutation(
    trpc.admin.theme.update.mutationOptions({
      onSuccess: () => {
        toast.success('Theme updated successfully')
        // Refresh the page to apply new theme
        startTransition(() => {
          router.refresh()
        })
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to update theme')
      }
    })
  )

  const handleThemeChange = (themeId: string) => {
    const theme = PRESET_THEMES.find((t) => t.id === themeId)
    if (!theme) return

    setSelectedTheme(themeId)
    updateTheme.mutate({ themeId })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme</CardTitle>
        <CardDescription>
          Choose a color theme for your admin dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PRESET_THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => handleThemeChange(theme.id)}
              disabled={isPending || updateTheme.isPending}
              className={`hover:border-primary relative rounded-lg border-2 p-4 text-left transition-all hover:shadow-md ${
                selectedTheme === theme.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card'
              } ${
                isPending || updateTheme.isPending
                  ? 'cursor-not-allowed opacity-50'
                  : 'cursor-pointer'
              } `}
            >
              {selectedTheme === theme.id && (
                <div className="absolute top-2 right-2">
                  <div className="bg-primary flex h-5 w-5 items-center justify-center rounded-full">
                    <svg
                      className="text-primary-foreground h-3 w-3"
                      fill="none"
                      strokeWidth="2"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
              )}

              <div className="mb-3">
                <div className="mb-2 flex items-center gap-2">
                  {/* Color preview dots */}
                  <div
                    className="h-6 w-6 rounded-full border"
                    style={{
                      background: extractCSSVariable(theme.css, '--primary')
                    }}
                  />
                  <div
                    className="h-6 w-6 rounded-full border"
                    style={{
                      background: extractCSSVariable(theme.css, '--secondary')
                    }}
                  />
                  <div
                    className="h-6 w-6 rounded-full border"
                    style={{
                      background: extractCSSVariable(theme.css, '--accent')
                    }}
                  />
                </div>
              </div>

              <h3 className="mb-1 text-lg font-semibold">{theme.name}</h3>
              <p className="text-muted-foreground text-sm">
                {theme.description}
              </p>
            </button>
          ))}
        </div>

        <div className="bg-muted/50 mt-6 rounded-lg p-4">
          <h4 className="mb-2 font-semibold">About Themes</h4>
          <p className="text-muted-foreground text-sm">
            Themes are applied globally across your admin dashboard. Changes
            take effect immediately after selection. You can switch themes at
            any time.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
