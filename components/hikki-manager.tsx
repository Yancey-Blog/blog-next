'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'

import {
  HikkiRowsSkeleton,
  HikkiDetailSkeleton
} from '@/components/hikki-loading'
import { HikkiNotifications } from '@/components/hikki-notifications'
import { HikkiPagePreview } from '@/components/hikki-page-preview'
import { HikkiReports } from '@/components/hikki-reports'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { useTRPC } from '@/lib/trpc/client'

type Action = 'approve' | 'reject' | 'unpublish'
export function HikkiManager({
  initialReview = null
}: {
  initialReview?: string | null
}) {
  const trpc = useTRPC(),
    cache = useQueryClient()
  const [published, setPublished] = useState(false)
  const [marker, setMarker] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(initialReview)
  const [reason, setReason] = useState('')
  const [inspected, setInspected] = useState<string | null>(null)
  const onPreviewReady = useCallback(
    (value: string | null) => setInspected(value),
    []
  )
  const [confirmation, setConfirmation] = useState<{
    action: Action
    id: string
    revision: string
  } | null>(null)
  const action = confirmation?.action
  const setAction = (action: Action | null) => {
    if (!action && published) setSelected(null)
    setConfirmation(
      action && detail.data?.revision
        ? { action, id: detail.data.id, revision: detail.data.revision }
        : null
    )
  }
  const queue = useQuery(
    trpc.hikki.queue.queryOptions({ marker }, { enabled: !published })
  )
  const listed = useQuery(
    trpc.hikki.listings.queryOptions({ marker }, { enabled: published })
  )
  const items = published ? listed.data?.items : queue.data?.items
  const id =
    published && !selected
      ? ''
      : selected &&
          (items?.some((item) => item.id === selected) ||
            (!published && !marker && selected === initialReview))
        ? selected
        : (items?.[0]?.id ?? '')
  const detail = useQuery(
    trpc.hikki.detail.queryOptions({ id, published }, { enabled: !!id })
  )
  useEffect(() => {
    if (
      confirmation?.action === 'unpublish' &&
      !confirmation.revision &&
      !detail.isFetching &&
      detail.data?.id === confirmation.id
    ) {
      setConfirmation({ ...confirmation, revision: detail.data.revision })
    }
  }, [confirmation, detail.data, detail.isFetching])
  const decide = useMutation(
    trpc.hikki.decide.mutationOptions({
      onSuccess: async (result, input) => {
        setAction(null)
        setReason('')
        setSelected(null)
        await Promise.all([
          cache.invalidateQueries(trpc.hikki.queue.queryFilter()),
          cache.invalidateQueries(trpc.hikki.listings.queryFilter()),
          cache.invalidateQueries(trpc.hikki.detail.queryFilter())
        ])
        if (input.action !== 'unpublish' && !result.notificationQueued)
          toast.warning(
            'Decision saved. Queued notifications will retry when you reload this page.'
          )
        else toast.success('Review decision saved')
      },
      onError: (error) => {
        if (error.data?.code === 'CONFLICT') {
          setAction(null)
          void cache.invalidateQueries(trpc.hikki.detail.queryFilter())
          void cache.invalidateQueries(trpc.hikki.queue.queryFilter())
          void cache.invalidateQueries(trpc.hikki.listings.queryFilter())
        }
        toast.error(error.message)
      }
    })
  )
  const error = published ? listed.error : queue.error
  const loading = published ? listed.isLoading : queue.isLoading
  const switchMode = (value: boolean) => {
    setPublished(value)
    setMarker(null)
    setSelected(null)
    setAction(null)
  }
  const workspace = (
    <>
      {error && (
        <p role="alert" className="text-destructive">
          {error.message}
        </p>
      )}
      <div
        className={
          published
            ? 'space-y-6'
            : 'grid gap-6 lg:grid-cols-[minmax(240px,1fr)_minmax(0,3fr)]'
        }
      >
        <Card>
          <CardHeader>
            <CardTitle>
              {published ? 'Published pages' : 'Review queue'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && (
              <HikkiRowsSkeleton label="Loading pages" table={published} />
            )}
            {items?.length === 0 && (
              <p className="text-muted-foreground">
                {published
                  ? 'Approved pages will appear here.'
                  : 'There are no submissions waiting for review.'}
              </p>
            )}
            {!loading &&
              (published ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Page</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Published</TableHead>
                      <TableHead>Public link</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items?.map((item) => (
                      <TableRow
                        key={item.id}
                        data-state={
                          selected === item.id ? 'selected' : undefined
                        }
                      >
                        <TableCell className="font-medium whitespace-normal">
                          {item.title}
                        </TableCell>
                        <TableCell>{item.author || 'Anonymous'}</TableCell>
                        <TableCell>{item.tags.join(', ') || '—'}</TableCell>
                        <TableCell>
                          {item.publishedAt
                            ? new Date(item.publishedAt).toLocaleString()
                            : 'Unavailable'}
                        </TableCell>
                        <TableCell>
                          {item.publicURL && (
                            <a
                              className="underline underline-offset-4"
                              href={item.publicURL}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Open page
                            </a>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="destructive"
                            disabled={decide.isPending || !!confirmation}
                            onClick={() => {
                              setSelected(item.id)
                              setConfirmation({
                                action: 'unpublish',
                                id: item.id,
                                revision: ''
                              })
                            }}
                          >
                            Unpublish
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                items?.map((item) => (
                  <Button
                    key={item.id}
                    variant={id === item.id ? 'secondary' : 'ghost'}
                    className="h-auto w-full justify-start py-3 text-left whitespace-normal"
                    disabled={decide.isPending}
                    onClick={() => {
                      setSelected(item.id)
                      setAction(null)
                    }}
                  >
                    <span>
                      <strong className="block">{item.title}</strong>
                      <span className="text-muted-foreground text-xs">
                        {item.author || 'Anonymous'} · {item.status}
                      </span>
                    </span>
                  </Button>
                ))
              ))}
            {(published ? listed.data?.marker : queue.data?.marker) && (
              <Button
                variant="outline"
                disabled={decide.isPending}
                onClick={() => {
                  setMarker(
                    (published ? listed.data?.marker : queue.data?.marker) ??
                      null
                  )
                  setSelected(null)
                  setAction(null)
                }}
              >
                Next page
              </Button>
            )}
            {marker && (
              <Button
                variant="ghost"
                disabled={decide.isPending}
                onClick={() => {
                  setMarker(null)
                  setSelected(null)
                  setAction(null)
                }}
              >
                First page
              </Button>
            )}
          </CardContent>
        </Card>
        {!published && (
          <Card>
            <CardHeader>
              <CardTitle>{detail.data?.title || 'Page preview'}</CardTitle>
              <CardDescription>
                {detail.data?.status || 'Select a page to inspect it.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {detail.isFetching && !!id && (
                <HikkiDetailSkeleton label="Loading preview" />
              )}
              {detail.error && (
                <p role="alert" className="text-destructive">
                  {detail.error.message}
                </p>
              )}
              {!detail.isFetching && detail.data && (
                <>
                  <HikkiPagePreview
                    key={`${published}:${id}:${detail.data.revision}`}
                    id={id}
                    revision={detail.data.revision}
                    published={published}
                    snapshot={`${published}:${id}:${detail.data.revision}`}
                    onReady={onPreviewReady}
                  />
                  <div className="flex flex-wrap gap-3">
                    {!published &&
                      ['pending', 'publishing'].includes(
                        detail.data.status
                      ) && (
                        <>
                          <Button
                            disabled={
                              decide.isPending ||
                              !detail.data.revision ||
                              (!published &&
                                inspected !==
                                  `${published}:${id}:${detail.data.revision}`)
                            }
                            onClick={() => setAction('approve')}
                          >
                            {detail.data.isUpdate
                              ? 'Approve update'
                              : 'Approve and publish'}
                          </Button>
                          <Button
                            variant="destructive"
                            disabled={
                              decide.isPending ||
                              !detail.data.revision ||
                              detail.data.status === 'publishing'
                            }
                            onClick={() => {
                              setReason('')
                              setAction('reject')
                            }}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
  return (
    <div className="space-y-6">
      <HikkiNotifications />
      <Tabs
        value={published ? 'published' : 'pending'}
        onValueChange={(value) => switchMode(value === 'published')}
        className="min-w-0 gap-4"
      >
        <TabsList aria-label="Community pages" variant="line">
          <TabsTrigger value="pending" disabled={decide.isPending}>
            Pending review
          </TabsTrigger>
          <TabsTrigger value="published" disabled={decide.isPending}>
            Published
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="min-w-0 space-y-4">
          {!published && workspace}
        </TabsContent>
        <TabsContent value="published" className="min-w-0 space-y-4">
          {published && workspace}
        </TabsContent>
      </Tabs>
      <HikkiReports />
      <Dialog
        open={!!action}
        onOpenChange={(open) => {
          if (!open && !decide.isPending) setAction(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'approve'
                ? 'Publish this page?'
                : action === 'reject'
                  ? 'Reject this submission?'
                  : 'Unpublish this page?'}
            </DialogTitle>
            <DialogDescription>
              {action === 'approve'
                ? detail.data?.isUpdate
                  ? 'The approved snapshot will replace the public page at its existing link.'
                  : 'The page will become publicly readable in Hikki Community.'
                : 'This action changes availability in Hikki Community.'}
            </DialogDescription>
          </DialogHeader>
          {action === 'unpublish' && !confirmation?.revision && (
            <HikkiDetailSkeleton label="Loading the current page version" />
          )}
          {action === 'unpublish' && detail.error && (
            <p role="alert" className="text-destructive">
              {detail.error.message}
            </p>
          )}
          {detail.data?.id === confirmation?.id && (
            <p className="font-medium">{detail.data?.title}</p>
          )}
          {confirmation?.revision &&
            detail.data?.revision !== confirmation.revision && (
              <p role="alert" className="text-destructive text-sm">
                This page changed. Close this dialog and review the latest
                version.
              </p>
            )}
          {action === 'reject' && (
            <div className="space-y-2">
              <Label htmlFor="hikki-rejection-reason">
                Reason for the author
              </Label>
              <Textarea
                id="hikki-rejection-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={1000}
                disabled={decide.isPending}
                required
              />
              <p className="text-muted-foreground text-sm">
                The author can read this explanation in Hikki.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={decide.isPending}
              onClick={() => setAction(null)}
            >
              Cancel
            </Button>
            <Button
              disabled={
                decide.isPending ||
                !confirmation?.revision ||
                detail.isFetching ||
                (action === 'approve' &&
                  inspected !==
                    `${published}:${id}:${detail.data?.revision}`) ||
                detail.data?.id !== confirmation?.id ||
                detail.data?.revision !== confirmation?.revision ||
                (action === 'reject' && !reason.trim())
              }
              onClick={() => {
                if (confirmation)
                  decide.mutate({
                    ...confirmation,
                    ...(action === 'reject' ? { reason: reason.trim() } : {})
                  })
              }}
            >
              {decide.isPending ? 'Saving…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
