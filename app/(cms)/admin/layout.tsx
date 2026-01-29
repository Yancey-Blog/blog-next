import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { ThemeModeProvider } from '@/components/theme-mode-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { isAdmin } from '@/lib/auth-utils'
import { autoPromoteAdmin } from '@/lib/auto-promote-admin'
import { SettingsService } from '@/lib/services/settings.service'
import { getSessionUser, requireAuth } from '@/lib/session'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode
}) {
  // Require authentication
  const session = await requireAuth()

  // Auto-promote super admins
  await autoPromoteAdmin(session.user.id, session.user.email)

  // Check if user is admin (reload user data after potential promotion)
  const updatedSession = await requireAuth()
  const user = getSessionUser(updatedSession)
  if (!isAdmin(user)) {
    redirect('/login')
  }

  // Get current theme
  const currentTheme = await SettingsService.getCurrentTheme()

  return (
    <ThemeModeProvider>
      <ThemeProvider themeId={currentTheme} />
      <SidebarProvider
        style={
          {
            '--sidebar-width': 'calc(var(--spacing) * 72)',
            '--header-height': 'calc(var(--spacing) * 12)'
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2 p-4">
              {children}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ThemeModeProvider>
  )
}
