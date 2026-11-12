'use client'

import { useQuery } from '@tanstack/react-query'

import { AdminDashboardSkeleton } from '@/components/admin-dashboard-skeleton'
import { ChartAreaInteractive } from '@/components/chart-area-interactive'
import { ChartPublishStatus } from '@/components/chart-publish-status'
import { ChartTagDistribution } from '@/components/chart-tag-distribution'
import { ChartTopPosts } from '@/components/chart-top-posts'
import { SectionCards } from '@/components/section-cards'
import { Button } from '@/components/ui/button'
import { useTRPC } from '@/lib/trpc/client'

export default function AdminDashboardPage() {
  const trpc = useTRPC()
  const dashboard = useQuery(trpc.admin.dashboard.queryOptions())

  if (dashboard.isPending) return <AdminDashboardSkeleton />

  if (dashboard.isError) {
    return (
      <div className="mx-auto flex min-h-64 max-w-lg flex-col items-center justify-center gap-3 text-center">
        <h1 className="text-lg font-semibold">Dashboard unavailable</h1>
        <p className="text-muted-foreground text-sm">
          The dashboard data could not be loaded.
        </p>
        <Button variant="outline" onClick={() => void dashboard.refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  const data = dashboard.data

  return (
    <div className="flex flex-col gap-6 pb-8">
      <SectionCards stats={data.stats} />
      <div className="grid gap-4 px-4 lg:px-6 @3xl/main:grid-cols-3">
        <div className="@3xl/main:col-span-2">
          <ChartAreaInteractive data={data.byMonth} />
        </div>
        <ChartPublishStatus
          published={data.stats.published}
          drafts={data.stats.drafts}
        />
      </div>
      <div className="px-4 lg:px-6">
        <ChartTopPosts topByPv={data.topByPv} topByLike={data.topByLike} />
      </div>
      <div className="px-4 lg:px-6">
        <ChartTagDistribution tagStats={data.tagStats} />
      </div>
    </div>
  )
}
