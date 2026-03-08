import { ChartAreaInteractive } from '@/components/chart-area-interactive'
import { ChartPublishStatus } from '@/components/chart-publish-status'
import { ChartTagDistribution } from '@/components/chart-tag-distribution'
import { ChartTopPosts } from '@/components/chart-top-posts'
import { SectionCards } from '@/components/section-cards'
import { getQueryClient, trpc } from '@/lib/trpc/server'

export default async function Page() {
  const queryClient = getQueryClient()

  const dashboard = await queryClient.fetchQuery(
    trpc.admin.dashboard.queryOptions()
  )

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Row 1: Stats cards */}
      <SectionCards stats={dashboard.stats} />

      {/* Row 2: Monthly trend + Publish status donut */}
      <div className="grid gap-4 px-4 lg:px-6 @3xl/main:grid-cols-3">
        <div className="@3xl/main:col-span-2">
          <ChartAreaInteractive data={dashboard.byMonth} />
        </div>
        <ChartPublishStatus
          published={dashboard.stats.published}
          drafts={dashboard.stats.drafts}
        />
      </div>

      {/* Row 3: Top posts by PV + Top posts by likes */}
      <div className="px-4 lg:px-6">
        <ChartTopPosts
          topByPv={dashboard.topByPv}
          topByLike={dashboard.topByLike}
        />
      </div>

      {/* Row 4: Tag distribution */}
      <div className="px-4 lg:px-6">
        <ChartTagDistribution tagStats={dashboard.tagStats} />
      </div>
    </div>
  )
}
