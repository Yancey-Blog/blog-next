'use client'

import { useAutosave } from '@/hooks/use-autosave'
import type { Blog } from '@/lib/db/schema'
import { useTRPC } from '@/lib/trpc/client'
import { createBlogSchema } from '@/lib/validations/blog'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { BlogEditor } from './blog-editor'
import { BlogImageUpload } from './blog-image-upload'
import { Button } from './ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'

interface BlogFormProps {
  blog?: Blog
  mode: 'create' | 'edit'
}

// Form schema without ID (ID is auto-generated)
const blogFormSchema = createBlogSchema.omit({ published: true })

type BlogFormData = z.infer<typeof blogFormSchema>

export function BlogForm({ blog, mode }: BlogFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [blogId, setBlogId] = useState(blog?.id || '')
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  // tRPC mutations
  const createBlog = useMutation(trpc.blog.create.mutationOptions())
  const updateBlog = useMutation(trpc.blog.update.mutationOptions())

  // Initialize form with react-hook-form
  const {
    control,
    watch,
    formState: { errors }
  } = useForm<BlogFormData>({
    resolver: zodResolver(blogFormSchema),
    defaultValues: {
      title: blog?.title ?? '',
      content: blog?.content ?? '',
      summary: blog?.summary ?? '',
      coverImage: blog?.coverImage ?? ''
    }
  })

  // Watch form data for autosave
  const formData = watch()
  const isPublished = blog?.published || false

  const shouldAutoSave = useMemo(
    () =>
      formData?.title.trim() !== '' &&
      formData?.summary.trim() !== '' &&
      formData?.coverImage.trim() !== '' &&
      formData?.content?.trim() !== '',
    [
      formData?.content,
      formData?.coverImage,
      formData?.summary,
      formData?.title
    ]
  )

  // Autosave functionality - only enabled for drafts
  const {
    status: autosaveStatus,
    lastSaved,
    error: autosaveError
  } = useAutosave({
    data: formData,
    enabled: !isPublished && !loading && shouldAutoSave,
    onSave: async (data) => {
      // For new blogs, create draft on first autosave
      if (!blogId && mode === 'create') {
        const newBlog = await createBlog.mutateAsync({
          ...data,
          published: false
        })

        setBlogId(newBlog.id)

        // Update URL to edit mode
        router.replace(`/admin/blog-management/edit/${newBlog.id}`)
      } else if (blogId) {
        // Update existing draft
        await updateBlog.mutateAsync({
          id: blogId,
          data
        })
      }
    }
  })

  // Show toast notifications for autosave status
  const toastIdRef = useRef<string | number | null>(null)

  useEffect(() => {
    if (autosaveStatus === 'saving') {
      toastIdRef.current = toast.loading('Saving draft...')
    } else if (autosaveStatus === 'saved' && toastIdRef.current) {
      toast.success('Draft saved', {
        id: toastIdRef.current,
        description: lastSaved
          ? `Last saved at ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          : undefined
      })
      toastIdRef.current = null
    } else if (autosaveStatus === 'error' && toastIdRef.current) {
      toast.error('Failed to save draft', {
        id: toastIdRef.current,
        description: autosaveError?.message || 'Please try again'
      })
      toastIdRef.current = null
    }
  }, [autosaveStatus, lastSaved, autosaveError])

  const handleSaveDraft = async () => {
    setLoading(true)
    try {
      const data = formData

      if (blogId) {
        await updateBlog.mutateAsync({
          id: blogId,
          data: { ...data, published: false }
        })
      } else {
        const newBlog = await createBlog.mutateAsync({
          ...data,
          published: false
        })
        setBlogId(newBlog.id)
        router.replace(`/admin/blog-management/edit/${newBlog.id}`)
      }

      toast.success('Draft saved successfully')
      queryClient.invalidateQueries({
        queryKey: trpc.blog.list.queryOptions({ page: 1 }).queryKey
      })
      router.refresh()
    } catch (error) {
      console.error('Save draft error:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to save draft'
      )
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async () => {
    setLoading(true)
    try {
      const data = formData

      if (blogId) {
        await updateBlog.mutateAsync({
          id: blogId,
          data: { ...data, published: true }
        })
      } else {
        const newBlog = await createBlog.mutateAsync({
          ...data,
          published: true
        })
        setBlogId(newBlog.id)
      }

      toast.success('Blog published successfully')
      queryClient.invalidateQueries({
        queryKey: trpc.blog.list.queryOptions({ page: 1 }).queryKey
      })
      router.push('/admin/blog-management')
      router.refresh()
    } catch (error) {
      console.error('Publish error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to publish')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Fill in the blog basic information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Controller
              name="title"
              control={control}
              render={({ field }) => (
                <Input
                  id="title"
                  placeholder="Enter blog title"
                  disabled={loading}
                  {...field}
                />
              )}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Controller
              name="summary"
              control={control}
              render={({ field }) => (
                <Textarea
                  id="summary"
                  placeholder="Brief description for SEO and list page"
                  rows={3}
                  disabled={loading}
                  {...field}
                  value={field.value || ''}
                />
              )}
            />
            {errors.summary && (
              <p className="text-sm text-destructive">
                {errors.summary.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Cover Image</Label>
            <Controller
              name="coverImage"
              control={control}
              render={({ field }) => (
                <BlogImageUpload
                  value={field.value || null}
                  onChange={(url) => field.onChange(url || '')}
                  disabled={loading}
                  className="w-80"
                />
              )}
            />
            {errors.coverImage && (
              <p className="text-sm text-destructive">
                {errors.coverImage.message}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-muted bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Status</Label>
                <p className="text-sm text-muted-foreground">
                  {isPublished ? 'Published' : 'Draft'}
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                {isPublished
                  ? 'This blog is publicly visible'
                  : 'This blog is saved as a draft'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
          <CardDescription>
            Write your blog content using the rich text editor. Supports image
            paste/upload
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Controller
            name="content"
            control={control}
            render={({ field }) => (
              <BlogEditor
                value={field.value}
                onChange={field.onChange}
                disabled={loading}
              />
            )}
          />
          {errors.content && (
            <p className="text-sm text-destructive mt-2">
              {errors.content.message}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>

        {!isPublished && (
          <Button
            type="button"
            variant="secondary"
            onClick={handleSaveDraft}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Draft'}
          </Button>
        )}

        <Button type="button" onClick={handlePublish} disabled={loading}>
          {loading ? 'Publishing...' : isPublished ? 'Update' : 'Publish'}
        </Button>
      </div>
    </form>
  )
}
