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
import { toast } from '@/components/ui/toast'
import { useTRPC } from '@/lib/trpc/client'

export function HikkiLinkShares() {
  const trpc = useTRPC(),
    cache = useQueryClient()
  const [marker, setMarker] = useState<string | null>(null)
  const [selection, setSelection] = useState<{
    id: string
    revision: string
  } | null>(null)
  const shares = useQuery(trpc.hikki.linkShares.queryOptions({ marker }))
  const remove = useMutation(
    trpc.hikki.removeLinkShare.mutationOptions({
      onSuccess: async () => {
        setSelection(null)
        await cache.invalidateQueries(trpc.hikki.linkShares.queryFilter())
        toast.success('The hosted copy was removed')
      },
      onError: (error) => {
        setSelection(null)
        void cache.invalidateQueries(trpc.hikki.linkShares.queryFilter())
        toast.error(error.message)
      }
    })
  )
  const date = (value: number | null) =>
    value ? new Date(value).toLocaleString() : 'Unavailable'
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Link sharing</CardTitle>
          <CardDescription>
            Encrypted pages shared outside Community. Content and titles cannot
            be read here without the complete sharing link. You can remove a
            hosted copy while keeping the author’s workspace intact.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {shares.isLoading && <p role="status">Loading shared links…</p>}
          {shares.error && (
            <p role="alert" className="text-destructive">
              {shares.error.message}
            </p>
          )}
          {shares.data?.items.length === 0 && (
            <p className="text-muted-foreground">
              There are no active link-only shares.
            </p>
          )}
          {!!shares.data?.items.length && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shared page</TableHead>
                  <TableHead>iCloud account</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shares.data.items.map((share) => (
                  <TableRow key={share.id}>
                    <TableCell className="break-all whitespace-normal">
                      {share.id}
                    </TableCell>
                    <TableCell className="break-all whitespace-normal">
                      {share.owner ?? 'Unavailable'}
                    </TableCell>
                    <TableCell>{date(share.createdAt)}</TableCell>
                    <TableCell>{date(share.updatedAt)}</TableCell>
                    <TableCell>
                      {share.bytes === null
                        ? 'Unavailable'
                        : `${Math.ceil(share.bytes / 1024).toLocaleString()} KB`}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        disabled={remove.isPending || !share.revision}
                        onClick={() =>
                          setSelection({
                            id: share.id,
                            revision: share.revision
                          })
                        }
                      >
                        Remove shared copy
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
                disabled={shares.isFetching || remove.isPending}
                onClick={() => setMarker(null)}
              >
                First page
              </Button>
            )}
            {shares.data?.marker && (
              <Button
                variant="outline"
                disabled={shares.isFetching || remove.isPending}
                onClick={() => setMarker(shares.data?.marker ?? null)}
              >
                More shared links
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      <Dialog
        open={!!selection}
        onOpenChange={(open) => {
          if (!open && !remove.isPending) setSelection(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this shared copy?</DialogTitle>
            <DialogDescription>
              The current sharing link will stop working. The author’s original
              document and copies readers have already saved are unaffected.
              This does not ban the author from sharing again.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm break-all">{selection?.id}</p>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={remove.isPending}
              onClick={() => setSelection(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={remove.isPending || !selection}
              onClick={() => {
                if (selection) remove.mutate(selection)
              }}
            >
              {remove.isPending ? 'Removing…' : 'Remove shared copy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
