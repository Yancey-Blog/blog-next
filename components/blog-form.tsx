'use client'

import type { Blog } from '@/lib/db/schema'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'
import { toast } from 'sonner'
import { BlogEditor } from './blog-editor'
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
import { Switch } from './ui/switch'
import { Textarea } from './ui/textarea'

interface BlogFormProps {
  blog?: Blog
  mode: 'create' | 'edit'
}

export function BlogForm({ blog, mode }: BlogFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: blog?.title || '',
    slug: blog?.slug || '',
    content: blog?.content || '',
    summary: blog?.summary || '',
    coverImage: blog?.coverImage || '',
    published: blog?.published || false,
    preview: blog?.preview || false
  })

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value
    setFormData((prev) => ({
      ...prev,
      title,
      // Auto-generate slug only in create mode
      slug: mode === 'create' ? generateSlug(title) : prev.slug
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = mode === 'create' ? '/api/blogs' : `/api/blogs/${blog?.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Operation failed')
      }

      const data = await response.json()

      // Create version snapshot in edit mode
      if (mode === 'edit' && blog?.id) {
        await fetch(`/api/blogs/${blog.id}/versions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            changeNote: 'Manual save'
          })
        })
      }

      toast.success(
        mode === 'create'
          ? 'Blog created successfully'
          : 'Blog updated successfully'
      )
      router.push('/admin/blog-management')
      router.refresh()
    } catch (error) {
      console.error('Submit error:', error)
      toast.error(error instanceof Error ? error.message : 'Operation failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveDraft = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        mode === 'create' ? '/api/blogs' : `/api/blogs/${blog?.id}`,
        {
          method: mode === 'create' ? 'POST' : 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...formData,
            published: false,
            preview: false
          })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save draft')
      }

      toast.success('Draft saved successfully')
      if (mode === 'create') {
        const data = await response.json()
        router.push(`/admin/blog-management/edit/${data.id}`)
        router.refresh()
      }
    } catch (error) {
      console.error('Save draft error:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to save draft'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Fill in the blog basic information. Title will auto-generate a
            URL-friendly slug
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={handleTitleChange}
              placeholder="Enter blog title"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug *</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, slug: e.target.value }))
              }
              placeholder="url-friendly-slug"
              required
              disabled={loading}
            />
            <p className="text-muted-foreground text-sm">
              URL: /blogs/{formData.slug || 'your-slug'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Textarea
              id="summary"
              value={formData.summary}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, summary: e.target.value }))
              }
              placeholder="Brief description for SEO and list page"
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="coverImage">Cover Image URL</Label>
            <Input
              id="coverImage"
              value={formData.coverImage}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  coverImage: e.target.value
                }))
              }
              placeholder="https://example.com/image.jpg"
              type="url"
              disabled={loading}
            />
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="preview"
                checked={formData.preview}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    preview: checked,
                    // If enabling preview, disable published
                    published: checked ? false : prev.published
                  }))
                }
                disabled={loading}
              />
              <div>
                <Label htmlFor="preview">Preview Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Enable preview to test before publishing (only visible to you)
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="published"
                checked={formData.published}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    published: checked,
                    // If enabling published, disable preview
                    preview: checked ? false : prev.preview
                  }))
                }
                disabled={loading || formData.preview}
              />
              <div>
                <Label htmlFor="published">Publish</Label>
                <p className="text-xs text-muted-foreground">
                  Make this blog publicly visible
                </p>
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
          <BlogEditor
            value={formData.content}
            onChange={(content) =>
              setFormData((prev) => ({ ...prev, content }))
            }
            disabled={loading}
          />
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
        <Button
          type="button"
          variant="secondary"
          onClick={handleSaveDraft}
          disabled={loading}
        >
          Save as Draft
        </Button>
        <Button type="submit" disabled={loading}>
          {loading
            ? 'Saving...'
            : mode === 'create'
              ? 'Create Blog'
              : 'Update Blog'}
        </Button>
      </div>
    </form>
  )
}
