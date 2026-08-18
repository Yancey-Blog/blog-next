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
import { Textarea } from '@/components/ui/textarea'
import { useTRPC } from '@/lib/trpc/client'
import type { MeijiProfile } from '@/lib/validations/meiji'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Upload } from 'lucide-react'
import Image from 'next/image'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

export function MeijiProfileForm() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [profile, setProfile] = useState<MeijiProfile | null>(null)
  const [loadedProfile, setLoadedProfile] = useState<MeijiProfile | null>(
    null
  )

  const { data, isLoading } = useQuery(trpc.meiji.getProfile.queryOptions())

  if (data && data !== loadedProfile) {
    setLoadedProfile(data)
    setProfile(data)
  }

  const getPresignedUrl = useMutation(
    trpc.upload.getPresignedUrl.mutationOptions()
  )

  const saveMutation = useMutation(
    trpc.meiji.updateProfile.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.meiji.getProfile.queryFilter())
        toast.success('Profile saved')
      },
      onError: (e) => toast.error(e.message || 'Failed to save profile')
    })
  )

  function set<K extends keyof MeijiProfile>(key: K, value: MeijiProfile[K]) {
    setProfile((p) => (p ? { ...p, [key]: value } : p))
  }

  async function handleAvatarUpload(file: File) {
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
      set('avatarUrl', publicUrl)
      toast.success('Avatar uploaded')
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  if (isLoading || !profile) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Meiji&apos;s basic info, shown in the hero.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-full border bg-muted">
            {profile.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt="avatar"
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl">
                🐱
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleAvatarUpload(f)
              e.target.value = ''
            }}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="mr-2 h-3.5 w-3.5" />
            )}
            {uploading ? 'Uploading...' : 'Upload avatar'}
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={profile.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="明治"
            />
          </div>
          <div className="space-y-2">
            <Label>Gender</Label>
            <Input
              value={profile.gender}
              onChange={(e) => set('gender', e.target.value)}
              placeholder="Boy"
            />
          </div>
          <div className="space-y-2">
            <Label>Breed</Label>
            <Input
              value={profile.breed}
              onChange={(e) => set('breed', e.target.value)}
              placeholder="Blue Golden Shaded British Shorthair"
            />
          </div>
          <div className="space-y-2">
            <Label>Birthday</Label>
            <Input
              type="date"
              value={profile.birthday}
              onChange={(e) => set('birthday', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>X handle</Label>
            <Input
              value={profile.xHandle}
              onChange={(e) => set('xHandle', e.target.value)}
              placeholder="meiji_20260305"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Bio</Label>
          <Textarea
            value={profile.bio}
            rows={3}
            onChange={(e) => set('bio', e.target.value)}
            placeholder="A short, cute introduction..."
          />
        </div>

        <div className="flex justify-end">
          <Button
            onClick={() => saveMutation.mutate(profile)}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save profile
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
