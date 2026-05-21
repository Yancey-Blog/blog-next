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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

interface Pending {
  url: string
  type: 'photo' | 'video'
}

export function MeijiMediaManager() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [pending, setPending] = useState<Pending | null>(null)
  const [caption, setCaption] = useState('')
  const [milestone, setMilestone] = useState('')

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
          vaccine).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* add new */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
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
              <div className="overflow-hidden rounded-lg border bg-background">
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
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : media && media.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {media.map((m) => (
              <div
                key={m.id}
                className="group relative overflow-hidden rounded-lg border bg-muted"
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
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold capitalize">
                    {m.milestone}
                  </span>
                )}
                <button
                  onClick={() => deleteMutation.mutate({ id: m.id })}
                  className="absolute right-1.5 top-1.5 rounded-full bg-background/90 p-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </button>
                {m.caption && (
                  <p className="truncate px-2 py-1 text-xs">{m.caption}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No media yet. Upload Meiji&apos;s first photo! 🐾
          </p>
        )}
      </CardContent>
    </Card>
  )
}
