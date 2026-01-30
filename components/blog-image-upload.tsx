'use client'

import { useTRPC } from '@/lib/trpc/client'
import { IconUpload, IconX } from '@tabler/icons-react'
import { useMutation } from '@tanstack/react-query'
import Image from 'next/image'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { Button } from './ui/button'

interface BlogImageUploadProps {
  value: string | null
  onChange: (url: string | null) => void
  disabled?: boolean
  className?: string
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
]

export function BlogImageUpload({
  value,
  onChange,
  disabled = false,
  className
}: BlogImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const trpc = useTRPC()

  const getPresignedUrl = useMutation(
    trpc.upload.getPresignedUrl.mutationOptions()
  )

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return 'Please upload a valid image file (JPEG, PNG, or WebP)'
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 5MB'
    }
    return null
  }

  const uploadFile = useCallback(
    async (file: File) => {
      const validationError = validateFile(file)
      if (validationError) {
        toast.error(validationError)
        return
      }

      setIsUploading(true)
      try {
        // Step 1: Get presigned URL
        const { uploadUrl, publicUrl } = await getPresignedUrl.mutateAsync({
          fileName: file.name,
          contentType: file.type
        })

        // Step 2: Upload directly to S3
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type
          },
          body: file
        })

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload to S3')
        }

        onChange(publicUrl)
        toast.success('Image uploaded successfully')
      } catch (error) {
        console.error('Upload error:', error)
        toast.error('Failed to upload image')
      } finally {
        setIsUploading(false)
      }
    },
    [getPresignedUrl, onChange]
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadFile(file)
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const file = e.dataTransfer.files?.[0]
      if (file) {
        uploadFile(file)
      }
    },
    [uploadFile]
  )

  const handleRemove = () => {
    onChange(null)
    toast.success('Image removed')
  }

  if (value) {
    return (
      <div className="space-y-2">
        <div className="relative aspect-video overflow-hidden rounded-lg border bg-muted w-80">
          <Image
            src={value}
            alt="Cover image"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRemove}
          disabled={disabled || isUploading}
          className="w-80"
        >
          <IconX className="mr-2 h-4 w-4" />
          Remove Image
        </Button>
      </div>
    )
  }

  return (
    <div
      className={`relative aspect-video overflow-hidden rounded-lg border-2 border-dashed transition-colors ${
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/25 bg-muted/50'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-primary/50'} ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 p-6 text-center">
        <input
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          onChange={handleFileChange}
          disabled={disabled || isUploading}
          className="hidden"
        />
        <IconUpload className="h-10 w-10 text-muted-foreground" />
        {isUploading ? (
          <div className="space-y-1">
            <p className="text-sm font-medium">Uploading...</p>
            <p className="text-xs text-muted-foreground">Please wait</p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-sm font-medium">
              Drop image here or click to upload
            </p>
            <p className="text-xs text-muted-foreground">
              JPEG, PNG, or WebP (max 5MB)
            </p>
          </div>
        )}
      </label>
    </div>
  )
}
