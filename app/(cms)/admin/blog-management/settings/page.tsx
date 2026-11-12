import { dehydrate, HydrationBoundary } from '@tanstack/react-query'

import { AIModelSettings } from '@/components/ai-model-settings'
import { PushNotificationSettings } from '@/components/push-notification-settings'
import { SettingsNav } from '@/components/settings-nav'
import { getQueryClient, trpc } from '@/lib/trpc/server'

const SECTIONS = [
  { id: 'ai-model', title: 'AI Model' },
  { id: 'push-notifications', title: 'Push Notifications' }
]

export default async function BlogSettingsPage() {
  const queryClient = getQueryClient()
  await Promise.all([
    queryClient.prefetchQuery(trpc.admin.aiModel.get.queryOptions()),
    queryClient.prefetchQuery(trpc.push.subscriberCount.queryOptions())
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="container mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Blog Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure the blog editor's AI model and reader notifications.
          </p>
        </header>
        <div className="grid gap-8 lg:grid-cols-[11rem_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <SettingsNav sections={SECTIONS} />
          </aside>
          <div className="min-w-0 space-y-8">
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
