'use client'

import { KeyRound, Plus } from 'lucide-react'
import { useState } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
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
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import { authClient } from '@/lib/auth/auth-client'

export function PasskeyManagement() {
  const { data: passkeys, isPending } = authClient.useListPasskeys()
  const [addOpen, setAddOpen] = useState(false)
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)

  async function handleAdd() {
    setAdding(true)
    try {
      await authClient.passkey.addPasskey({ name: name || undefined })
      toast.success('Passkey added')
      setAddOpen(false)
      setName('')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to add passkey'
      )
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(id: string) {
    const { error } = await authClient.passkey.deletePasskey({ id })
    if (error) {
      toast.error(error.message || 'Failed to delete passkey')
    } else {
      toast.success('Passkey removed')
    }
  }

  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="mt-2 h-4 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Passkeys</CardTitle>
          <CardDescription>
            Devices you can use to sign in without OAuth, tied to this
            browser/device.
          </CardDescription>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add passkey
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a passkey</DialogTitle>
              <DialogDescription>
                Your browser will prompt you to use a fingerprint, face scan,
                screen lock, or security key.
              </DialogDescription>
            </DialogHeader>
            <Field>
              <FieldLabel htmlFor="passkey-name">Name (optional)</FieldLabel>
              <Input
                id="passkey-name"
                placeholder="e.g. MacBook Touch ID"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <DialogFooter>
              <Button onClick={handleAdd} disabled={adding}>
                {adding ? 'Adding...' : 'Continue'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {!passkeys || passkeys.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No passkeys registered yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {passkeys.map((passkey) => (
                <TableRow key={passkey.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <KeyRound className="text-muted-foreground h-4 w-4" />
                      {passkey.name || 'Unnamed passkey'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(passkey.createdAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button variant="destructive" size="sm">
                            Delete
                          </Button>
                        }
                      />
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Passkey</AlertDialogTitle>
                          <AlertDialogDescription>
                            You will no longer be able to sign in with this
                            passkey.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(passkey.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
