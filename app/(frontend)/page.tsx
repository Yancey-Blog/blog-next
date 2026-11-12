import type { Metadata } from 'next'
import { Suspense } from 'react'
import { cache } from 'react'

import { HomeArticles } from '@/components/home-articles'
import { HomeHero } from '@/components/home-hero'
import { HomeOpenSource } from '@/components/home-open-source'
import {
  HomeArticlesSkeleton,
  HomeHeroSkeleton,
  HomeOpenSourceSkeleton
} from '@/components/home-skeletons'
import { SettingsService } from '@/lib/services/settings.service'
import { getQueryClient, trpc } from '@/lib/trpc/server'

export const metadata: Metadata = {
  title: 'Home | Yancey Blog - Thoughts, Stories & Ideas',
  description:
    'Welcome to Yancey blog. Discover articles about technology, design, and everything in between. Fresh perspectives and insights from our community.'
}

const getHomeBlogs = cache(async () => {
  const queryClient = getQueryClient()
  return queryClient.query(
    trpc.blog.list.queryOptions({ page: 1, pageSize: 7 })
  )
})

export default function Home() {
  return (
    <div className="min-h-screen">
      <Suspense fallback={<HomeHeroSkeleton />}>
        <HomeHeroSection />
      </Suspense>
      <Suspense fallback={<HomeOpenSourceSkeleton />}>
        <HomeOpenSourceSection />
      </Suspense>
      <Suspense fallback={<HomeArticlesSkeleton />}>
        <HomeArticlesSection />
      </Suspense>
    </div>
  )
}

async function HomeHeroSection() {
  const [blogsData, heroImage] = await Promise.all([
    getHomeBlogs(),
    SettingsService.getHeroImage()
  ])

  return (
    <HomeHero
      totalArticles={blogsData.pagination.total}
      heroImage={heroImage}
    />
  )
}

async function HomeOpenSourceSection() {
  const projects = await SettingsService.getOpenSourceProjects()
  return <HomeOpenSource projects={projects} />
}

async function HomeArticlesSection() {
  const blogsData = await getHomeBlogs()
  return <HomeArticles blogs={blogsData.data} />
}
