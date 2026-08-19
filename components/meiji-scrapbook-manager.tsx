'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Upload } from 'lucide-react'
import Image from 'next/image'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTRPC } from '@/lib/trpc/client'
import {
  SCRAPBOOK_SLOT_COUNT,
  type ScrapbookItem
} from '@/lib/validations/meiji'

const empty = (): ScrapbookItem => ({ imageUrl: '', caption: '' })

function pad(items: ScrapbookItem[]): ScrapbookItem[] {
  const out = items.slice(0, SCRAPBOOK_SLOT_COUNT)
  while (out.length < SCRAPBOOK_SLOT_COUNT) out.push(empty())
  return out
}

export function MeijiScrapbookManager() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [items, setItems] = useState<ScrapbookItem[] | null>(null)
  const [loadedData, setLoadedData] = useState<ScrapbookItem[] | null>(null)
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const fileRefs = useRef<(HTMLInputElement | null)[]>([])

  const { data, isLoading } = useQuery(trpc.meiji.getScrapbook.queryOptions())

  if (data && data !== loadedData) {
    setLoadedData(data)
    setItems(pad(data))
  }

  const getPresignedUrl = useMutation(
    trpc.upload.getPresignedUrl.mutationOptions()
  )

  const saveMutation = useMutation(
    trpc.meiji.setScrapbook.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.meiji.getScrapbook.queryFilter())
        toast.success('Scrapbook saved')
      },
      onError: (e) => toast.error(e.message || 'Failed to save')
    })
  )

  function update(index: number, field: keyof ScrapbookItem, value: string) {
    setItems((prev) =>
      (prev ?? []).map((it, i) =>
        i === index ? { ...it, [field]: value } : it
      )
    )
  }

  async function handleUpload(index: number, file: File) {
    setUploadingIndex(index)
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
      update(index, 'imageUrl', publicUrl)
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploadingIndex(null)
    }
  }

  if (isLoading || !items) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hero scrapbook</CardTitle>
        <CardDescription>
          Up to {SCRAPBOOK_SLOT_COUNT} photos scattered around the hero. Empty
          slots show a cute emoji placeholder.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((it, i) => (
            <div
              key={i}
              className="bg-muted/30 space-y-3 rounded-lg border p-4"
            >
              <span className="text-muted-foreground text-sm font-medium">
                Polaroid {i + 1}
              </span>
              <div className="flex items-center gap-3">
                <div className="bg-muted relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border">
                  {it.imageUrl ? (
                    <Image
                      src={it.imageUrl}
                      alt={it.caption || `polaroid ${i + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl">
                      🐱
                    </div>
                  )}
                </div>
                <input
                  ref={(el) => {
                    fileRefs.current[i] = el
                  }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleUpload(i, f)
                    e.target.value = ''
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploadingIndex === i}
                  onClick={() => fileRefs.current[i]?.click()}
                >
                  {uploadingIndex === i ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-3.5 w-3.5" />
                  )}
                  {it.imageUrl ? 'Replace' : 'Upload'}
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Caption</Label>
                <Input
                  value={it.caption}
                  onChange={(e) => update(i, 'caption', e.target.value)}
                  placeholder="day one 🐾"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button
            onClick={() => saveMutation.mutate(items)}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save scrapbook
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
