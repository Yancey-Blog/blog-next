'use client'

import { PRESET_THEMES } from '@/lib/themes'
import { trpc } from '@/lib/trpc/client'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
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

export function ThemeSettings({ currentTheme }: ThemeSettingsProps) {
  const [selectedTheme, setSelectedTheme] = useState(currentTheme)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const updateTheme = trpc.admin.theme.update.useMutation({
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

  const handleThemeChange = (themeId: string) => {
    const theme = PRESET_THEMES.find((t) => t.id === themeId)
    if (!theme) return

    setSelectedTheme(themeId)
    updateTheme.mutate({ theme })
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRESET_THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => handleThemeChange(theme.id)}
              disabled={isPending || updateTheme.isPending}
              className={`
                relative p-4 rounded-lg border-2 text-left transition-all
                hover:border-primary hover:shadow-md
                ${
                  selectedTheme === theme.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card'
                }
                ${
                  isPending || updateTheme.isPending
                    ? 'opacity-50 cursor-not-allowed'
                    : 'cursor-pointer'
                }
              `}
            >
              {selectedTheme === theme.id && (
                <div className="absolute top-2 right-2">
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-primary-foreground"
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
                <div className="flex items-center gap-2 mb-2">
                  {/* Color preview dots */}
                  <div
                    className="w-6 h-6 rounded-full border"
                    style={{
                      background: theme.cssVars.light['--primary']
                    }}
                  />
                  <div
                    className="w-6 h-6 rounded-full border"
                    style={{
                      background: theme.cssVars.light['--secondary']
                    }}
                  />
                  <div
                    className="w-6 h-6 rounded-full border"
                    style={{
                      background: theme.cssVars.light['--accent']
                    }}
                  />
                </div>
              </div>

              <h3 className="font-semibold text-lg mb-1">{theme.name}</h3>
              <p className="text-sm text-muted-foreground">
                {theme.description}
              </p>
            </button>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-semibold mb-2">About Themes</h4>
          <p className="text-sm text-muted-foreground">
            Themes are applied globally across your admin dashboard. Changes
            take effect immediately after selection. You can switch themes at
            any time.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
