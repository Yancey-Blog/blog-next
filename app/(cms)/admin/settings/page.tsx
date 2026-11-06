import { dehydrate, HydrationBoundary } from '@tanstack/react-query'

import { ThemeSettings } from '@/components/theme-settings'
import { getQueryClient, trpc } from '@/lib/trpc/server'

export default async function SettingsPage() {
  const queryClient = getQueryClient()
  const theme = await queryClient.fetchQuery(
    trpc.admin.theme.get.queryOptions()
  )
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="container mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Choose the appearance of your CMS.
          </p>
        </header>
        <ThemeSettings currentTheme={theme.id} />
      </div>
    </HydrationBoundary>
  )
}
