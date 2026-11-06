'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

import { HikkiRowsSkeleton } from '@/components/hikki-loading'
import { Button, buttonVariants } from '@/components/ui/button'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption
} from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import { createReviewerLink } from '@/lib/hikki/pairing-link'
import { useTRPC } from '@/lib/trpc/client'

export function HikkiNotifications() {
  const trpc = useTRPC(),
    cache = useQueryClient()
  const [attempt, setAttempt] = useState<ReturnType<
    typeof createReviewerLink
  > | null>(null)
  const [name, setName] = useState('')
  useEffect(() => {
    if (!attempt) return
    const timeout = setTimeout(
      () => setAttempt(null),
      Math.max(0, attempt.expiresAt - Date.now())
    )
    return () => clearTimeout(timeout)
  }, [attempt])
  const [marker, setMarker] = useState<string | null>(null)
  const [removing, setRemoving] = useState<{
    id: string
    revision: string
    name: string
  } | null>(null)
  const devices = useQuery(trpc.hikki.devices.queryOptions({ marker }))
  const identity = useQuery(
    trpc.hikki.serverIdentity.queryOptions(undefined, {
      enabled: false,
      retry: false
    })
  )
  const refresh = () =>
    cache.invalidateQueries(trpc.hikki.devices.queryFilter())
  const pair = useMutation(
    trpc.hikki.pairDevice.mutationOptions({
      onSuccess: () => {
        setAttempt(null)
        setName('')
        void refresh()
        toast.success('Reviewer account linked')
      },
      onError: (error) => toast.error(error.message)
    })
  )
  const update = useMutation(
    trpc.hikki.updateDevice.mutationOptions({
      onSuccess: () => {
        setRemoving(null)
        void refresh()
        toast.success('Reviewer account updated')
      },
      onError: (error) => {
        void refresh()
        toast.error(error.message)
      }
    })
  )
  const retry = useMutation(trpc.hikki.retryPush.mutationOptions())
  const recoveryStarted = useRef(false)
  useEffect(() => {
    if (!devices.isSuccess || recoveryStarted.current) return
    recoveryStarted.current = true
    retry.mutate()
  }, [devices.isSuccess, retry.mutate])
  const date = (value: number | null) =>
    value ? new Date(value).toLocaleString() : 'Unavailable'
  return (
    <Card>
      <CardHeader>
        <CardTitle>Review notifications</CardTitle>
        <CardDescription>
          Connect your reviewer iCloud account from an iPhone or iPad. Review
          alerts go to enabled iOS devices using that account. macOS does not
          receive separate community pushes. Changing phones on the same account
          does not require another connection.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (attempt && attempt.expiresAt > Date.now())
              pair.mutate({ code: attempt.code, name: name.trim() })
            else setAttempt(createReviewerLink())
          }}
        >
          <div className="w-full min-w-0 space-y-2 sm:w-auto sm:flex-1">
            <Label htmlFor="hikki-device-name">Reviewer label</Label>
            <Input
              id="hikki-device-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              required
              autoComplete="off"
              disabled={pair.isPending}
            />
          </div>
          <Button
            type="submit"
            disabled={pair.isPending || !name.trim() || !devices.data}
          >
            {pair.isPending
              ? 'Connecting…'
              : attempt
                ? 'Complete connection'
                : 'Create connection link'}
          </Button>
          {attempt && (
            <div className="w-full space-y-3" role="status">
              <p className="text-muted-foreground max-w-prose text-sm">
                Open this one-time link on your iPhone or iPad and confirm in
                Hikki. Then return to this CMS tab and select Complete
                connection. The link expires after 10 minutes. Requires Hikki
                1.1.0 (8) or later.
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  className={buttonVariants({ variant: 'outline' })}
                  href={attempt.url}
                >
                  Open Hikki on iPhone or iPad
                </a>
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(attempt.url)
                      toast.success(
                        'Connection link copied. Open it only on your own iPhone or iPad.'
                      )
                    } catch {
                      toast.error(
                        'Could not copy the link. Open this CMS page on your iPhone or iPad instead.'
                      )
                    }
                  }}
                >
                  Copy connection link
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={pair.isPending}
                  onClick={() => setAttempt(null)}
                >
                  Cancel connection
                </Button>
              </div>
            </div>
          )}
        </form>
        {devices.isLoading && (
          <HikkiRowsSkeleton label="Loading reviewer accounts" table />
        )}
        {devices.error && (
          <div className="space-y-3">
            <p role="alert" className="text-destructive">
              {devices.error.message}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void devices.refetch()}>
                Retry
              </Button>
              <Button
                variant="outline"
                disabled={identity.isFetching}
                onClick={() => void identity.refetch()}
              >
                {identity.isFetching ? 'Checking…' : 'Identify server account'}
              </Button>
            </div>
          </div>
        )}
        <details className="space-y-3">
          <summary className="cursor-pointer text-sm font-medium">
            Server setup and troubleshooting
          </summary>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground max-w-prose">
              This is a one-time server configuration. Changing your phone or
              reviewer iCloud account does not require changing the server role.
            </p>
            <Button
              variant="outline"
              disabled={identity.isFetching}
              onClick={() => void identity.refetch()}
            >
              {identity.isFetching ? 'Checking…' : 'Identify server account'}
            </Button>
            {identity.error && (
              <p role="alert" className="text-destructive">
                {identity.error.message}
              </p>
            )}
            {identity.data && (
              <div className="space-y-3">
                <p>
                  {identity.data.containerId} · {identity.data.environment}
                </p>
                <p>
                  Server user record:{' '}
                  <code className="break-all select-all">
                    {identity.data.userRecordName}
                  </code>
                </p>
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        identity.data!.userRecordName
                      )
                      toast.success('Server record ID copied')
                    } catch {
                      toast.error('Select and copy the server record ID above.')
                    }
                  }}
                >
                  Copy server record ID
                </Button>
                <ol className="text-muted-foreground list-decimal space-y-2 pl-5">
                  <li>
                    Open{' '}
                    <a
                      className="underline underline-offset-4"
                      href="https://icloud.developer.apple.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      CloudKit Console
                    </a>{' '}
                    and select the container and environment shown above.
                  </li>
                  <li>
                    In Records → Public Database → Users, find this exact server
                    record and assign HikkiModerator in Security Roles.
                  </li>
                  <li>
                    Return here and recheck access. Connect your notification
                    account separately using the connection form above.
                  </li>
                </ol>
                <Button
                  variant="outline"
                  disabled={devices.isFetching}
                  onClick={() => void devices.refetch()}
                >
                  Recheck reviewer access
                </Button>
              </div>
            )}
          </div>
        </details>
        {devices.data?.items.length === 0 && (
          <p className="text-muted-foreground">
            No reviewer account linked. Authors can still enable approval
            notifications in Hikki.
          </p>
        )}
        {!!devices.data?.items.length && (
          <Table>
            <TableCaption>
              Device counts include registered iOS devices. Apple does not
              provide their iCloud email addresses.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Reviewer</TableHead>
                <TableHead>iCloud account</TableHead>
                <TableHead>Linked by</TableHead>
                <TableHead>Connected</TableHead>
                <TableHead>Enabled iOS devices</TableHead>
                <TableHead>Last device update</TableHead>
                <TableHead>Review alerts</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.data?.items.map((device) => (
                <TableRow key={device.id}>
                  <TableCell className="font-medium">{device.name}</TableCell>
                  <TableCell>
                    <code className="text-xs select-all">{device.account}</code>
                  </TableCell>
                  <TableCell>{device.email}</TableCell>
                  <TableCell>{date(device.linkedAt)}</TableCell>
                  <TableCell>
                    {device.enabledDevices}
                    {device.moreDevices ? '+' : ''}
                  </TableCell>
                  <TableCell>{date(device.deviceUpdatedAt)}</TableCell>
                  <TableCell>
                    <Switch
                      aria-label={`Review notifications for ${device.name}`}
                      checked={device.enabled}
                      disabled={update.isPending}
                      onCheckedChange={(enabled) =>
                        update.mutate({
                          id: device.id,
                          revision: device.revision,
                          enabled
                        })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      disabled={update.isPending}
                      onClick={() => setRemoving(device)}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="flex flex-wrap gap-2">
          {devices.data?.marker && (
            <Button
              variant="outline"
              onClick={() => setMarker(devices.data!.marker)}
            >
              More accounts
            </Button>
          )}
          {marker && (
            <Button variant="ghost" onClick={() => setMarker(null)}>
              First page
            </Button>
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          Only the current verified ADMIN_EMAILS can link a reviewer account.
          This list grants notification delivery only. CMS access continues to
          use the existing administrator whitelist. Queued alerts are retried
          automatically when this page loads.
        </p>
      </CardContent>
      <Dialog
        open={!!removing}
        onOpenChange={(open) => {
          if (!open && !update.isPending) setRemoving(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlink reviewer account?</DialogTitle>
            <DialogDescription>
              {removing?.name} and its other enabled iOS devices will stop
              receiving review alerts. Create a new connection link in this CMS
              to link the account again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={update.isPending}
              onClick={() => setRemoving(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={update.isPending}
              onClick={() => {
                if (removing)
                  update.mutate({
                    id: removing.id,
                    revision: removing.revision,
                    remove: true
                  })
              }}
            >
              {update.isPending ? 'Removing…' : 'Unlink account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
