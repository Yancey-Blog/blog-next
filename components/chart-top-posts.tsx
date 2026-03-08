'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from '@/components/ui/chart'
import { Bar, BarChart, Cell, XAxis, YAxis } from 'recharts'

interface Post {
  id: string
  title: string
  pv?: number
  like?: number
}

interface Props {
  topByPv: Post[]
  topByLike: Post[]
}

const pvConfig = {
  value: { label: 'Page Views', color: 'var(--primary)' }
} satisfies ChartConfig

const likeConfig = {
  value: { label: 'Likes', color: 'var(--primary)' }
} satisfies ChartConfig

function TopChart({
  posts,
  valueKey,
  config,
  title,
  description
}: {
  posts: Post[]
  valueKey: 'pv' | 'like'
  config: ChartConfig
  title: string
  description: string
}) {
  const chartData = posts.map((p, i) => ({
    rank: `#${i + 1}`,
    value: p[valueKey] ?? 0,
    title: p.title
  }))

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        {/* Bar chart — Y axis shows rank numbers only */}
        <ChartContainer config={config} className="h-[220px] w-full">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 0, right: 16 }}
          >
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              type="category"
              dataKey="rank"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={32}
              tick={{ fontSize: 12 }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.title ?? ''
                  }
                />
              }
            />
            <Bar dataKey="value" radius={4}>
              {chartData.map((_, i) => (
                <Cell key={i} fill="var(--primary)" fillOpacity={1 - i * 0.1} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>

        {/* Legend — HTML so truncate works properly */}
        <ul className="mt-3 space-y-1.5 border-t pt-3">
          {chartData.map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span className="w-6 shrink-0 text-xs tabular-nums text-muted-foreground">
                {item.rank}
              </span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {item.title}
              </span>
              <span className="shrink-0 tabular-nums font-medium">
                {item.value.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export function ChartTopPosts({ topByPv, topByLike }: Props) {
  return (
    <div className="grid gap-4 @xl/main:grid-cols-2">
      <TopChart
        posts={topByPv}
        valueKey="pv"
        config={pvConfig}
        title="Top Posts by Views"
        description="Most viewed published posts"
      />
      <TopChart
        posts={topByLike}
        valueKey="like"
        config={likeConfig}
        title="Top Posts by Likes"
        description="Most liked published posts"
      />
    </div>
  )
}
