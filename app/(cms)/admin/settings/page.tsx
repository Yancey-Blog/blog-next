import { ThemeSettings } from '@/components/theme-settings'
import { getQueryClient, trpc } from '@/lib/trpc/server'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'

export default async function SettingsPage() {
  const queryClient = getQueryClient()

  const theme = await queryClient.fetchQuery(
    trpc.admin.theme.get.queryOptions()
  )
  const currentTheme = theme.id

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="container mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Customize your admin dashboard appearance and behavior
          </p>
        </div>

        <ThemeSettings currentTheme={currentTheme} />
      </div>
    </HydrationBoundary>
  )
}
