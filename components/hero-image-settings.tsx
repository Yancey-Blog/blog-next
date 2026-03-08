'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useTRPC } from '@/lib/trpc/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImageIcon, Loader2, Upload } from 'lucide-react'
import Image from 'next/image'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

const FALLBACK_IMAGE = 'https://static.yancey.app/ng9bwfv1-1728444113930.jpeg'

export function HeroImageSettings() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const { data } = useQuery(trpc.admin.heroImage.get.queryOptions())
  const currentUrl = data?.url ?? null

  const saveMutation = useMutation(
    trpc.admin.heroImage.set.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.admin.heroImage.get.queryFilter())
        toast.success('Hero image updated')
      },
      onError: () => toast.error('Failed to save image URL')
    })
  )

  const getPresignedUrl = useMutation(
    trpc.upload.getPresignedUrl.mutationOptions()
  )

  async function handleFileUpload(file: File) {
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
      saveMutation.mutate({ url: publicUrl })
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const isSaving = saveMutation.isPending
  const isWorking = uploading || isSaving

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hero Background Image</CardTitle>
        <CardDescription>
          The full-viewport background image shown on the homepage hero section.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preview */}
        <div className="relative h-48 w-full overflow-hidden rounded-lg border bg-muted">
          <Image
            src={currentUrl ?? FALLBACK_IMAGE}
            alt="Hero preview"
            fill
            className="object-cover"
            unoptimized
          />
          {!currentUrl && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 text-white/70">
              <ImageIcon className="h-8 w-8" />
              <span className="text-xs">Using default image</span>
            </div>
          )}
        </div>

        {/* Upload from file */}
        <div className="space-y-2">
          <Label>Upload new image</Label>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileUpload(file)
                e.target.value = ''
              }}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isWorking}
              className="w-full"
            >
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {uploading ? 'Uploading...' : 'Choose file'}
            </Button>
          </div>
        </div>

        {currentUrl && (
          <p className="break-all text-xs text-muted-foreground">
            Current: {currentUrl}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
