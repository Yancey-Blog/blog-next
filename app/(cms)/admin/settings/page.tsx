import { dehydrate, HydrationBoundary } from '@tanstack/react-query'

import { AIModelSettings } from '@/components/ai-model-settings'
import { HeroImageSettings } from '@/components/hero-image-settings'
import { OpenSourceSettings } from '@/components/open-source-settings'
import { PushNotificationSettings } from '@/components/push-notification-settings'
import { SettingsNav } from '@/components/settings-nav'
import { ThemeSettings } from '@/components/theme-settings'
import { getQueryClient, trpc } from '@/lib/trpc/server'

const SECTIONS = [
  { id: 'hero-image', title: 'Hero Image' },
  { id: 'open-source', title: 'Open Source' },
  { id: 'theme', title: 'Theme' },
  { id: 'ai-model', title: 'AI Model' },
  { id: 'push-notifications', title: 'Push Notifications' }
]

export default async function SettingsPage() {
  const queryClient = getQueryClient()

  await Promise.all([
    queryClient.prefetchQuery(trpc.admin.theme.get.queryOptions()),
    queryClient.prefetchQuery(trpc.admin.heroImage.get.queryOptions()),
    queryClient.prefetchQuery(trpc.admin.openSource.get.queryOptions()),
    queryClient.prefetchQuery(trpc.admin.aiModel.get.queryOptions()),
    queryClient.prefetchQuery(trpc.push.subscriberCount.queryOptions())
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

        <div className="grid gap-8 lg:grid-cols-[11rem_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <SettingsNav sections={SECTIONS} />
          </aside>
          <div className="space-y-8">
            <section id="hero-image" className="scroll-mt-6">
              <HeroImageSettings />
            </section>
            <section id="open-source" className="scroll-mt-6">
              <OpenSourceSettings />
            </section>
            <section id="theme" className="scroll-mt-6">
              <ThemeSettings currentTheme={currentTheme} />
            </section>
            <section id="ai-model" className="scroll-mt-6">
              <AIModelSettings />
            </section>
            <section id="push-notifications" className="scroll-mt-6">
              <PushNotificationSettings />
            </section>
          </div>
        </div>
      </div>
    </HydrationBoundary>
  )
}
