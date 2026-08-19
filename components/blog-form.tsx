'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { useAutosave } from '@/hooks/use-autosave'
import type { Blog } from '@/lib/db/schema'
import { useTRPC } from '@/lib/trpc/client'
import { createBlogSchema } from '@/lib/validations/blog'

import { BlogImageUpload } from './blog-image-upload'
import { Button } from './ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from './ui/card'
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor
} from './ui/combobox'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'

function TagsField({
  value,
  onChange,
  disabled
}: {
  value: string[]
  onChange: (tags: string[]) => void
  disabled?: boolean
}) {
  const [query, setQuery] = useState('')
  const anchorRef = useComboboxAnchor()
  const trimmed = query.trim()
  // The only selectable item is whatever the user is currently typing, so
  // pressing Enter commits it as a new tag - there's no fixed tag vocabulary.
  const items = trimmed && !value.includes(trimmed) ? [trimmed] : []

  return (
    <Combobox
      items={items}
      multiple
      value={value}
      onValueChange={(next) => {
        onChange(next)
        setQuery('')
      }}
      inputValue={query}
      onInputValueChange={setQuery}
      disabled={disabled}
    >
      <ComboboxChips ref={anchorRef}>
        <ComboboxValue>
          {(tags: string[]) =>
            tags.map((tag) => <ComboboxChip key={tag}>{tag}</ComboboxChip>)
          }
        </ComboboxValue>
        <ComboboxChipsInput placeholder="Add a tag and press Enter" />
      </ComboboxChips>
      <ComboboxContent anchor={anchorRef}>
        <ComboboxEmpty>Type to add a tag</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              Add &quot;{item}&quot;
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

// BlockNote's useCreateBlockNote touches `window` at render, so the editor must
// be client-only (no SSR), otherwise the admin page throws during server render.
const BlogEditor = dynamic(
  () => import('./blog-editor').then((m) => m.BlogEditor),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted flex min-h-96 items-center justify-center rounded-md border">
        <p className="text-muted-foreground text-sm">Loading editor...</p>
      </div>
    )
  }
)

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
    formState: { errors }
  } = useForm<BlogFormData>({
    resolver: zodResolver(blogFormSchema),
    defaultValues: {
      title: blog?.title ?? '',
      contentBlocks: blog?.contentBlocks ?? '',
      summary: blog?.summary ?? '',
      coverImage: blog?.coverImage ?? '',
      tags: blog?.tags ?? []
    }
  })

  // Watch form data for autosave. useWatch types every field as optional to
  // cover the pre-mount state, but defaultValues always populates them.
  const formData = useWatch({ control }) as BlogFormData
  const isPublished = blog?.published || false

  const shouldAutoSave = useMemo(
    () =>
      formData?.title.trim() !== '' &&
      formData?.summary.trim() !== '' &&
      formData?.coverImage.trim() !== '' &&
      formData?.contentBlocks?.trim() !== '',
    [
      formData?.contentBlocks,
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
      // Invalidate both frontend and admin lists
      queryClient.invalidateQueries({
        queryKey: trpc.blog.list.queryOptions({ page: 1 }).queryKey
      })
      queryClient.invalidateQueries({
        queryKey: trpc.blog.listAdmin.queryOptions({ page: 1 }).queryKey
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
      // Invalidate both frontend and admin lists
      queryClient.invalidateQueries({
        queryKey: trpc.blog.list.queryOptions({ page: 1 }).queryKey
      })
      queryClient.invalidateQueries({
        queryKey: trpc.blog.listAdmin.queryOptions({ page: 1 }).queryKey
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
              <p className="text-destructive text-sm">{errors.title.message}</p>
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
              <p className="text-destructive text-sm">
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
              <p className="text-destructive text-sm">
                {errors.coverImage.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <Controller
              name="tags"
              control={control}
              render={({ field }) => (
                <TagsField
                  value={field.value ?? []}
                  onChange={field.onChange}
                  disabled={loading}
                />
              )}
            />
            {errors.tags && (
              <p className="text-destructive text-sm">{errors.tags.message}</p>
            )}
          </div>

          <div className="border-muted bg-muted/50 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Status</Label>
                <p className="text-muted-foreground text-sm">
                  {isPublished ? 'Published' : 'Draft'}
                </p>
              </div>
              <div className="text-muted-foreground text-sm">
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
            name="contentBlocks"
            control={control}
            render={({ field }) => (
              <BlogEditor
                initialContent={blog?.contentBlocks ?? undefined}
                onChange={field.onChange}
                disabled={loading}
              />
            )}
          />
          {errors.contentBlocks && (
            <p className="text-destructive mt-2 text-sm">
              {errors.contentBlocks.message}
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
