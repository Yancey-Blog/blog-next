import { ThemeSettings } from '@/components/theme-settings'
import { SettingsService } from '@/lib/services/settings.service'

export default async function SettingsPage() {
  const currentTheme = await SettingsService.getCurrentTheme()

  return (
    <div className="container mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Customize your admin dashboard appearance and behavior
        </p>
      </div>

      <ThemeSettings currentTheme={currentTheme} />
    </div>
  )
}
