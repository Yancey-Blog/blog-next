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
import { Cell, Pie, PieChart } from 'recharts'

const chartConfig = {
  published: { label: 'Published', color: 'var(--primary)' },
  drafts: { label: 'Drafts', color: 'var(--muted-foreground)' }
} satisfies ChartConfig

interface Props {
  published: number
  drafts: number
}

export function ChartPublishStatus({ published, drafts }: Props) {
  const data = [
    { name: 'published', value: published, label: 'Published' },
    { name: 'drafts', value: drafts, label: 'Drafts' }
  ]
  const total = published + drafts

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Publish Status</CardTitle>
        <CardDescription>Published vs drafts</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center pb-6">
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              strokeWidth={2}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={`var(--color-${entry.name})`} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="flex w-full justify-around text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold tabular-nums">{published}</div>
            <div className="text-muted-foreground">Published</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold tabular-nums">{drafts}</div>
            <div className="text-muted-foreground">Drafts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold tabular-nums">
              {total > 0 ? Math.round((published / total) * 100) : 0}%
            </div>
            <div className="text-muted-foreground">Rate</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
