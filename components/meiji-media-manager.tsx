'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

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
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { MeijiMedia } from '@/lib/db/schema'
import { useTRPC } from '@/lib/trpc/client'

interface Pending {
  url: string
  type: 'photo' | 'video'
}

/** Format a Date for an <input type="datetime-local"> (local time, no tz). */
function toDateTimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function MeijiMediaManager() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [pending, setPending] = useState<Pending | null>(null)
  const [caption, setCaption] = useState('')
  const [milestone, setMilestone] = useState('')
  const [editing, setEditing] = useState<MeijiMedia | null>(null)

  const { data: media, isLoading } = useQuery(
    trpc.meiji.listMedia.queryOptions()
  )

  const getPresignedUrl = useMutation(
    trpc.upload.getPresignedUrl.mutationOptions()
  )

  const invalidate = () =>
    queryClient.invalidateQueries(trpc.meiji.listMedia.queryFilter())

  const createMutation = useMutation(
    trpc.meiji.createMedia.mutationOptions({
      onSuccess: () => {
        invalidate()
        setPending(null)
        setCaption('')
        setMilestone('')
        toast.success('Added to feed')
      },
      onError: (e) => toast.error(e.message || 'Failed to add')
    })
  )

  const deleteMutation = useMutation(
    trpc.meiji.deleteMedia.mutationOptions({
      onSuccess: () => {
        invalidate()
        toast.success('Removed')
      },
      onError: () => toast.error('Failed to remove')
    })
  )

  async function handleUpload(file: File) {
    setUploading(true)
    try {
      const { uploadUrl, publicUrl } = await getPresignedUrl.mutateAsync({
        fileName: file.name,
        contentType: file.type
      })
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      })
      setPending({
        url: publicUrl,
        type: file.type.startsWith('video') ? 'video' : 'photo'
      })
      toast.success('Uploaded — add a caption and save')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Media feed</CardTitle>
        <CardDescription>
          Upload photos and videos. Optionally tag a milestone (e.g. birthday,
          vaccine). Click the pencil to edit an existing item.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* add new */}
        <div className="bg-muted/30 space-y-4 rounded-lg border p-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleUpload(f)
              e.target.value = ''
            }}
          />

          {pending ? (
            <div className="space-y-3">
              <div className="bg-background overflow-hidden rounded-lg border">
                {pending.type === 'video' ? (
                  <video
                    src={pending.url}
                    controls
                    className="max-h-56 w-full"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pending.url}
                    alt="preview"
                    className="max-h-56 w-full object-contain"
                  />
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Caption</Label>
                  <Input
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Sleepy Sunday 😴"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Milestone (optional)</Label>
                  <Input
                    value={milestone}
                    onChange={(e) => setMilestone(e.target.value)}
                    placeholder="birthday / vaccine / ..."
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() =>
                    createMutation.mutate({
                      type: pending.type,
                      url: pending.url,
                      caption: caption || null,
                      milestone: milestone || null
                    })
                  }
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Add to feed
                </Button>
                <Button variant="ghost" onClick={() => setPending(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {uploading ? 'Uploading...' : 'Upload photo / video'}
            </Button>
          )}
        </div>

        {/* existing */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          </div>
        ) : media && media.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {media.map((m) => (
              <div
                key={m.id}
                className="group bg-muted relative overflow-hidden rounded-lg border"
              >
                {m.type === 'video' ? (
                  <video
                    src={m.url}
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.url}
                    alt={m.caption ?? 'media'}
                    className="aspect-square w-full object-cover"
                  />
                )}
                {m.milestone && (
                  <span className="bg-background/90 absolute top-1.5 left-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize">
                    {m.milestone}
                  </span>
                )}
                <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => setEditing(m)}
                    className="bg-background/90 rounded-full p-1.5"
                    aria-label="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate({ id: m.id })}
                    className="bg-background/90 rounded-full p-1.5"
                    aria-label="Delete"
                  >
                    <Trash2 className="text-destructive h-3.5 w-3.5" />
                  </button>
                </div>
                {m.caption && (
                  <p className="truncate px-2 py-1 text-xs">{m.caption}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground py-6 text-center text-sm">
            No media yet. Upload Meiji&apos;s first photo! 🐾
          </p>
        )}
      </CardContent>

      {editing && (
        <EditMediaDialog
          key={editing.id}
          media={editing}
          onSaved={invalidate}
          onClose={() => setEditing(null)}
        />
      )}
    </Card>
  )
}

function EditMediaDialog({
  media,
  onSaved,
  onClose
}: {
  media: MeijiMedia
  onSaved: () => void
  onClose: () => void
}) {
  const trpc = useTRPC()
  const fileRef = useRef<HTMLInputElement>(null)
  const [caption, setCaption] = useState(media.caption ?? '')
  const [milestone, setMilestone] = useState(media.milestone ?? '')
  const [takenAt, setTakenAt] = useState(
    toDateTimeLocal(new Date(media.takenAt))
  )
  const [url, setUrl] = useState(media.url)
  const [type, setType] = useState<'photo' | 'video'>(
    media.type === 'video' ? 'video' : 'photo'
  )
  const [uploading, setUploading] = useState(false)

  const getPresignedUrl = useMutation(
    trpc.upload.getPresignedUrl.mutationOptions()
  )

  const updateMutation = useMutation(
    trpc.meiji.updateMedia.mutationOptions({
      onSuccess: () => {
        onSaved()
        toast.success('Saved')
        onClose()
      },
      onError: (e) => toast.error(e.message || 'Failed to save')
    })
  )

  async function handleReplace(file: File) {
    setUploading(true)
    try {
      const { uploadUrl, publicUrl } = await getPresignedUrl.mutateAsync({
        fileName: file.name,
        contentType: file.type
      })
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      })
      setUrl(publicUrl)
      setType(file.type.startsWith('video') ? 'video' : 'photo')
      toast.success('Replaced — save to apply')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function handleSave() {
    const parsed = new Date(takenAt)
    updateMutation.mutate({
      id: media.id,
      data: {
        url,
        type,
        caption: caption || null,
        milestone: milestone || null,
        ...(takenAt && !Number.isNaN(parsed.getTime()) && { takenAt: parsed })
      }
    })
  }

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit media</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleReplace(f)
              e.target.value = ''
            }}
          />

          <div className="bg-muted overflow-hidden rounded-lg border">
            {type === 'video' ? (
              <video src={url} controls className="max-h-56 w-full" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt="preview"
                className="max-h-56 w-full object-contain"
              />
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {uploading ? 'Uploading...' : 'Replace media'}
          </Button>

          <div className="space-y-2">
            <Label>Caption</Label>
            <Input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Sleepy Sunday 😴"
            />
          </div>
          <div className="space-y-2">
            <Label>Milestone (optional)</Label>
            <Input
              value={milestone}
              onChange={(e) => setMilestone(e.target.value)}
              placeholder="birthday / vaccine / ..."
            />
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="datetime-local"
              value={takenAt}
              onChange={(e) => setTakenAt(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending || uploading}
          >
            {updateMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
