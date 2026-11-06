'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from '@/components/ui/toast'
import { useTRPC } from '@/lib/trpc/client'

const reasons: Record<string, string> = {
  unsafe: 'Harmful or illegal content',
  harassment: 'Harassment or hate',
  privacy: 'Private or personal information',
  rights: 'Copyright or other rights',
  spam: 'Spam or misleading content',
  other: 'Something else'
}
const statuses = [
  ['open', 'Open'],
  ['removing', 'Removal in progress'],
  ['removed', 'Removed'],
  ['dismissed', 'Dismissed'],
  ['unavailable', 'No longer shared']
] as const
type Status = (typeof statuses)[number][0]
const date = (value: number | null) =>
  value ? new Date(value).toLocaleString() : 'Unavailable'

export function HikkiReports() {
  const trpc = useTRPC(),
    cache = useQueryClient()
  const [status, setStatus] = useState<Status>('open')
  const [marker, setMarker] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)
  const reports = useQuery(trpc.hikki.reports.queryOptions({ status, marker }))
  const detail = useQuery(
    trpc.hikki.reportDetail.queryOptions(
      { id: selected ?? '' },
      { enabled: !!selected, staleTime: 0 }
    )
  )
  const resolve = useMutation(
    trpc.hikki.resolveReport.mutationOptions({
      onSuccess: async (result) => {
        setSelected(null)
        setConfirm(false)
        await cache.invalidateQueries(trpc.hikki.reports.queryFilter())
        toast.success(
          result.status === 'removed'
            ? 'Shared copy removed and report resolved'
            : 'Report resolved'
        )
      },
      onError: (error) => {
        setConfirm(false)
        void cache.invalidateQueries(trpc.hikki.reportDetail.queryFilter())
        void cache.invalidateQueries(trpc.hikki.reports.queryFilter())
        toast.error(error.message)
      }
    })
  )
  const report = detail.data
  const act = (action: 'dismiss' | 'remove' | 'unavailable') => {
    if (!report) return
    resolve.mutate({
      id: report.id,
      revision: report.revision,
      action,
      ...(action === 'remove' ? { targetRevision: report.target.revision } : {})
    })
  }
  const results = (
    <>
      {reports.isLoading && <p role="status">Loading reports…</p>}
      {reports.error && (
        <p role="alert" className="text-destructive">
          {reports.error.message}
        </p>
      )}
      {reports.data?.items.length === 0 && (
        <p className="text-muted-foreground">
          No {statuses.find(([key]) => key === status)?.[1].toLowerCase()}{' '}
          reports.
        </p>
      )}
      {!!reports.data?.items.length && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reason</TableHead>
              <TableHead>Sharing</TableHead>
              <TableHead>Received</TableHead>
              <TableHead>Resolved</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.data.items.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  {reasons[entry.reason] ?? 'Unknown reason'}
                </TableCell>
                <TableCell>
                  {entry.scope === 'link' ? 'Encrypted link' : 'Community'}
                </TableCell>
                <TableCell>{date(entry.createdAt)}</TableCell>
                <TableCell>
                  {entry.resolvedAt ? date(entry.resolvedAt) : '—'}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelected(entry.id)
                      setConfirm(false)
                    }}
                  >
                    View report
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <div className="flex gap-2">
        {marker && (
          <Button
            variant="outline"
            disabled={reports.isFetching}
            onClick={() => setMarker(null)}
          >
            First page
          </Button>
        )}
        {reports.data?.marker && (
          <Button
            variant="outline"
            disabled={reports.isFetching}
            onClick={() => setMarker(reports.data?.marker ?? null)}
          >
            More reports
          </Button>
        )}
      </div>
    </>
  )
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Page reports</CardTitle>
          <CardDescription>
            Reader-submitted concerns about Community and link-only pages.
            Reports include the reader’s explanation, never the page’s
            decryption key or an automatic copy of its contents. No proactive
            inspection of link-only pages is performed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs
            value={status}
            onValueChange={(value) => {
              const next = statuses.find(([key]) => key === value)?.[0]
              if (next) {
                setStatus(next)
                setMarker(null)
              }
            }}
            className="min-w-0"
          >
            <TabsList
              aria-label="Report status"
              variant="line"
              className="max-w-full justify-start overflow-x-auto"
            >
              {statuses.map(([key, label]) => (
                <TabsTrigger key={key} value={key} className="flex-none">
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
            {statuses.map(([key]) => (
              <TabsContent key={key} value={key} className="min-w-0 space-y-4">
                {status === key && results}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open && !resolve.isPending) {
            setSelected(null)
            setConfirm(false)
          }
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {confirm ? 'Remove this shared copy?' : 'Page report'}
            </DialogTitle>
            <DialogDescription>
              {confirm
                ? 'This stops the current sharing link. The author’s workspace and copies readers already saved are unaffected. The author can share again.'
                : 'An anonymous reader submitted this concern. Their explanation is an allegation, not verified page content.'}
            </DialogDescription>
          </DialogHeader>
          {detail.isFetching && <p role="status">Loading current report…</p>}
          {detail.error && (
            <p role="alert" className="text-destructive">
              {detail.error.message}
            </p>
          )}
          {report && !detail.isFetching && !detail.error && (
            <>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="font-medium">Reason</dt>
                  <dd>{reasons[report.reason] ?? 'Unknown reason'}</dd>
                </div>
                <div>
                  <dt className="font-medium">Reader’s explanation</dt>
                  <dd className="mt-1 break-words whitespace-pre-wrap">
                    {report.details || 'No explanation supplied.'}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium">Page ID</dt>
                  <dd className="break-all">{report.page}</dd>
                </div>
                <div>
                  <dt className="font-medium">Status</dt>
                  <dd>{report.status}</dd>
                </div>
                {report.resolvedBy && (
                  <div>
                    <dt className="font-medium">Resolved by</dt>
                    <dd className="break-all">
                      {report.resolvedBy} · {date(report.resolvedAt)}
                    </dd>
                  </div>
                )}
              </dl>
              {report.target.changed && (
                <p className="text-muted-foreground text-sm">
                  The hosted page has changed since this report. Removing it
                  takes down the current version, which may differ from what the
                  reader reported.
                </p>
              )}
              {!report.target.exists && (
                <p className="text-muted-foreground text-sm">
                  This page is no longer shared. There is no hosted copy to
                  remove.
                </p>
              )}
              <DialogFooter>
                {['open', 'removing'].includes(report.status) &&
                  (confirm ? (
                    <>
                      <Button
                        variant="outline"
                        disabled={resolve.isPending}
                        onClick={() => setConfirm(false)}
                      >
                        Back
                      </Button>
                      <Button
                        variant="destructive"
                        disabled={resolve.isPending || !report.target.revision}
                        onClick={() => act('remove')}
                      >
                        {resolve.isPending ? 'Removing…' : 'Remove shared copy'}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        disabled={
                          resolve.isPending ||
                          (report.status === 'removing' &&
                            (!report.target.exists ||
                              report.target.revision ===
                                report.removalRevision))
                        }
                        onClick={() => act('dismiss')}
                      >
                        Dismiss report
                      </Button>
                      {report.target.exists ? (
                        <Button
                          variant="destructive"
                          disabled={
                            resolve.isPending ||
                            !report.target.revision ||
                            (report.status === 'removing' &&
                              report.target.revision !== report.removalRevision)
                          }
                          onClick={() => setConfirm(true)}
                        >
                          {report.status === 'removing'
                            ? 'Continue removal…'
                            : 'Remove shared copy…'}
                        </Button>
                      ) : (
                        <Button
                          disabled={resolve.isPending}
                          onClick={() => act('unavailable')}
                        >
                          Close as no longer shared
                        </Button>
                      )}
                    </>
                  ))}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
