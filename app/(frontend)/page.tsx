import { HomeArticles } from '@/components/home-articles'
import { HomeHero } from '@/components/home-hero'
import { SettingsService } from '@/lib/services/settings.service'
import { getQueryClient, trpc } from '@/lib/trpc/server'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Home | Yancey Blog - Thoughts, Stories & Ideas',
  description:
    'Welcome to Yancey blog. Discover articles about technology, design, and everything in between. Fresh perspectives and insights from our community.'
}

export default async function Home() {
  const queryClient = getQueryClient()

  const [blogsData, heroImage] = await Promise.all([
    queryClient.fetchQuery(
      trpc.blog.list.queryOptions({ page: 1, pageSize: 7 })
    ),
    SettingsService.getHeroImage()
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="min-h-screen">
        <HomeHero
          totalArticles={blogsData.pagination.total}
          heroImage={heroImage}
        />
        <HomeArticles blogs={blogsData.data} />
      </div>
    </HydrationBoundary>
  )
}
