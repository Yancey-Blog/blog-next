import { MeijiMediaManager } from '@/components/meiji-media-manager'
import { MeijiProfileForm } from '@/components/meiji-profile-form'
import { MeijiTweetsManager } from '@/components/meiji-tweets-manager'
import { getQueryClient, trpc } from '@/lib/trpc/server'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'

export default async function MeijiManagementPage() {
  const queryClient = getQueryClient()

  await Promise.all([
    queryClient.prefetchQuery(trpc.meiji.getProfile.queryOptions()),
    queryClient.prefetchQuery(trpc.meiji.listMedia.queryOptions()),
    queryClient.prefetchQuery(trpc.meiji.getFeaturedTweets.queryOptions())
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="container mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Meiji 🐱</h1>
          <p className="text-muted-foreground mt-2">
            Manage the cat site at meiji.yanceyleo.com — profile, media feed, and
            featured tweets.
          </p>
        </div>

        <div className="space-y-8">
          <MeijiProfileForm />
          <MeijiMediaManager />
          <MeijiTweetsManager />
        </div>
      </div>
    </HydrationBoundary>
  )
}
