import { HeroImageSettings } from '@/components/hero-image-settings'
import { OpenSourceSettings } from '@/components/open-source-settings'
import { ThemeSettings } from '@/components/theme-settings'
import { getQueryClient, trpc } from '@/lib/trpc/server'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'

export default async function SettingsPage() {
  const queryClient = getQueryClient()

  await Promise.all([
    queryClient.prefetchQuery(trpc.admin.theme.get.queryOptions()),
    queryClient.prefetchQuery(trpc.admin.heroImage.get.queryOptions()),
    queryClient.prefetchQuery(trpc.admin.openSource.get.queryOptions())
  ])

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
            Customize your blog appearance and behavior
          </p>
        </div>

        <div className="space-y-8">
          <HeroImageSettings />
          <OpenSourceSettings />
          <ThemeSettings currentTheme={currentTheme} />
        </div>
      </div>
    </HydrationBoundary>
  )
}
