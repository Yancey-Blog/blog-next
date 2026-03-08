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
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts'

interface TagStat {
  tag: string
  count: number
}

const chartConfig = {
  count: { label: 'Posts', color: 'var(--primary)' }
} satisfies ChartConfig

export function ChartTagDistribution({ tagStats }: { tagStats: TagStat[] }) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Tag Distribution</CardTitle>
        <CardDescription>Number of posts per tag</CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <BarChart
            data={tagStats}
            margin={{ top: 4, right: 4, left: -8, bottom: 0 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="tag"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              allowDecimals={false}
              width={28}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {tagStats.map((_, i) => (
                <Cell
                  key={i}
                  fill="var(--primary)"
                  fillOpacity={0.9 - i * 0.05}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
