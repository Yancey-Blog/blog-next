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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImageIcon, Loader2, Plus, Trash2, Upload } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

interface Project {
  name: string
  logo: string
  link: string
  description: string
}

const emptyProject = (): Project => ({
  name: '',
  logo: '',
  link: '',
  description: ''
})

export function OpenSourceSettings() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [projects, setProjects] = useState<Project[]>([])
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const { data, isLoading } = useQuery(trpc.admin.openSource.get.queryOptions())

  useEffect(() => {
    if (data) setProjects(data)
  }, [data])

  const saveMutation = useMutation(
    trpc.admin.openSource.set.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.admin.openSource.get.queryFilter())
        toast.success('Open source projects saved')
      },
      onError: () => toast.error('Failed to save projects')
    })
  )

  const getPresignedUrl = useMutation(
    trpc.upload.getPresignedUrl.mutationOptions()
  )

  async function handleLogoUpload(index: number, file: File) {
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
      setProjects((prev) =>
        prev.map((p, i) => (i === index ? { ...p, logo: publicUrl } : p))
      )
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploadingIndex(null)
    }
  }

  function updateProject(index: number, field: keyof Project, value: string) {
    setProjects((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    )
  }

  function addProject() {
    if (projects.length >= 3) return
    setProjects((prev) => [...prev, emptyProject()])
  }

  function removeProject(index: number) {
    setProjects((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSave() {
    const invalid = projects.some((p) => !p.name || !p.logo || !p.link)
    if (invalid) {
      toast.error('Please fill in name, logo, and link for all projects')
      return
    }
    saveMutation.mutate(projects)
  }

  if (isLoading) {
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
        <CardTitle>Open Source Projects</CardTitle>
        <CardDescription>
          Showcase up to 3 open source projects on the homepage. Each project
          needs a name, logo, link, and description.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {projects.map((project, index) => (
          <div
            key={index}
            className="relative rounded-lg border bg-muted/30 p-4 space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Project {index + 1}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeProject(index)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  placeholder="e.g. My Awesome Project"
                  value={project.name}
                  onChange={(e) => updateProject(index, 'name', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border bg-muted">
                    {project.logo ? (
                      <Image
                        src={project.logo}
                        alt="logo"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <input
                    ref={(el) => {
                      fileInputRefs.current[index] = el
                    }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleLogoUpload(index, file)
                      e.target.value = ''
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={uploadingIndex === index}
                    onClick={() => fileInputRefs.current[index]?.click()}
                  >
                    {uploadingIndex === index ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-3.5 w-3.5" />
                    )}
                    {uploadingIndex === index ? 'Uploading...' : 'Upload'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Link</Label>
              <Input
                placeholder="https://..."
                value={project.link}
                onChange={(e) => updateProject(index, 'link', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description of the project..."
                value={project.description}
                rows={2}
                onChange={(e) =>
                  updateProject(index, 'description', e.target.value)
                }
              />
            </div>
          </div>
        ))}

        <div className="flex items-center gap-3">
          {projects.length < 3 && (
            <Button variant="outline" onClick={addProject} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Project
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="ml-auto"
          >
            {saveMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
