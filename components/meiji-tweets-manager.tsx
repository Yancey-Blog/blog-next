'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTRPC } from '@/lib/trpc/client'
import { parseTweetId, type FeaturedTweet } from '@/lib/validations/meiji'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export function MeijiTweetsManager() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [tweets, setTweets] = useState<FeaturedTweet[] | null>(null)

  const { data, isLoading } = useQuery(
    trpc.meiji.getFeaturedTweets.queryOptions()
  )

  useEffect(() => {
    // Seed editable local state from the fetched list once it arrives (the
    // same pattern as the other admin managers); data is stable post-fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (data) setTweets(data)
  }, [data])

  const saveMutation = useMutation(
    trpc.meiji.setFeaturedTweets.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          trpc.meiji.getFeaturedTweets.queryFilter()
        )
        toast.success('Featured tweets saved')
      },
      onError: (e) => toast.error(e.message || 'Failed to save')
    })
  )

  function update(index: number, field: keyof FeaturedTweet, value: string) {
    setTweets((prev) =>
      (prev ?? []).map((t, i) => (i === index ? { ...t, [field]: value } : t))
    )
  }

  function handleSave() {
    const list = tweets ?? []
    const bad = list.find((t) => !parseTweetId(t.url))
    if (bad) {
      toast.error(`Not a valid tweet URL: ${bad.url}`)
      return
    }
    saveMutation.mutate(list)
  }

  if (isLoading || tweets === null) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Featured tweets</CardTitle>
        <CardDescription>
          Paste X/Twitter post URLs to embed on the cat site (e.g. milestones).
          Order here = order shown.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {tweets.map((t, i) => (
          <div key={i} className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Tweet {i + 1}
                {parseTweetId(t.url) ? '' : ' · invalid URL'}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setTweets((prev) =>
                    (prev ?? []).filter((_, idx) => idx !== i)
                  )
                }
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Tweet URL</Label>
              <Input
                value={t.url}
                onChange={(e) => update(i, 'url', e.target.value)}
                placeholder="https://x.com/meiji_20260305/status/123..."
              />
            </div>
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Input
                value={t.note ?? ''}
                onChange={(e) => update(i, 'note', e.target.value)}
                placeholder="First vaccine! 💉"
              />
            </div>
          </div>
        ))}

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() =>
              setTweets((prev) => [...(prev ?? []), { url: '', note: '' }])
            }
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add tweet
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="ml-auto"
          >
            {saveMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
