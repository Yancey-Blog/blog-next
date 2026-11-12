import { dehydrate, HydrationBoundary } from '@tanstack/react-query'

import { HeroImageSettings } from '@/components/hero-image-settings'
import { OpenSourceSettings } from '@/components/open-source-settings'
import { PushNotificationSettings } from '@/components/push-notification-settings'
import { SettingsNav } from '@/components/settings-nav'
import { getQueryClient, trpc } from '@/lib/trpc/server'

const SECTIONS = [
  { id: 'hero-image', title: 'Hero Image' },
  { id: 'open-source', title: 'Open Source' },
  { id: 'push-notifications', title: 'Push Notifications' }
]

export default async function BlogSettingsPage() {
  const queryClient = getQueryClient()
  await Promise.all([
    queryClient
      .query(trpc.admin.heroImage.get.queryOptions())
      .catch(() => undefined),
    queryClient
      .query(trpc.admin.openSource.get.queryOptions())
      .catch(() => undefined),
    queryClient
      .query(trpc.push.subscriberCount.queryOptions())
      .catch(() => undefined)
  ])
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="container mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Media Assets</h1>
          <p className="text-muted-foreground mt-2">
            Manage the blog homepage image and featured open source projects.
          </p>
        </header>
        <div className="grid gap-8 lg:grid-cols-[11rem_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <SettingsNav sections={SECTIONS} />
          </aside>
          <div className="min-w-0 space-y-8">
            <section id="hero-image" className="scroll-mt-6">
              <HeroImageSettings />
            </section>
            <section id="open-source" className="scroll-mt-6">
              <OpenSourceSettings />
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
