import { IconEye, IconHeart, IconNotes, IconSend } from '@tabler/icons-react'

import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'

interface Stats {
  total: number
  published: number
  drafts: number
  totalPv: number
  totalLike: number
}

export function SectionCards({ stats }: { stats: Stats }) {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Posts</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.total.toLocaleString()}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex items-center gap-2 text-sm text-muted-foreground">
          <IconNotes className="size-4" />
          {stats.published} published · {stats.drafts} drafts
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Published</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.published.toLocaleString()}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex items-center gap-2 text-sm text-muted-foreground">
          <IconSend className="size-4" />
          {stats.total > 0
            ? Math.round((stats.published / stats.total) * 100)
            : 0}
          % of all posts
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Page Views</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.totalPv.toLocaleString()}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex items-center gap-2 text-sm text-muted-foreground">
          <IconEye className="size-4" />
          {stats.published > 0
            ? Math.round(stats.totalPv / stats.published).toLocaleString()
            : 0}{' '}
          avg per post
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Likes</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.totalLike.toLocaleString()}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex items-center gap-2 text-sm text-muted-foreground">
          <IconHeart className="size-4" />
          {stats.published > 0
            ? Math.round(stats.totalLike / stats.published).toLocaleString()
            : 0}{' '}
          avg per post
        </CardFooter>
      </Card>
    </div>
  )
}
