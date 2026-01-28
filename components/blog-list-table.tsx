'use client'

import type { Blog } from '@/lib/db/schema'
import { Edit, ExternalLink, Search } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { DeleteBlogDialog } from './delete-blog-dialog'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Input } from './ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from './ui/table'
import { Tabs, TabsList, TabsTrigger } from './ui/tabs'

interface BlogListTableProps {
  blogs: Blog[]
}

type StatusFilter = 'all' | 'published' | 'preview' | 'draft'

export function BlogListTable({ blogs }: BlogListTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const filteredBlogs = useMemo(() => {
    return blogs.filter((blog) => {
      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        blog.slug.toLowerCase().includes(searchQuery.toLowerCase())

      // Status filter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'published' && blog.published) ||
        (statusFilter === 'preview' && blog.preview) ||
        (statusFilter === 'draft' && !blog.published && !blog.preview)

      return matchesSearch && matchesStatus
    })
  }, [blogs, searchQuery, statusFilter])

  const getStatusBadge = (blog: Blog) => {
    if (blog.published) {
      return (
        <Badge className="bg-green-500 hover:bg-green-600">Published</Badge>
      )
    }
    if (blog.preview) {
      return <Badge className="bg-blue-500 hover:bg-blue-600">Preview</Badge>
    }
    return <Badge variant="secondary">Draft</Badge>
  }

  const statusCounts = useMemo(() => {
    return {
      all: blogs.length,
      published: blogs.filter((b) => b.published).length,
      preview: blogs.filter((b) => b.preview).length,
      draft: blogs.filter((b) => !b.published && !b.preview).length
    }
  }, [blogs])

  return (
    <div className="space-y-4">
      {/* Search and Filter Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as StatusFilter)}
        >
          <TabsList>
            <TabsTrigger value="all">All ({statusCounts.all})</TabsTrigger>
            <TabsTrigger value="published">
              Published ({statusCounts.published})
            </TabsTrigger>
            <TabsTrigger value="preview">
              Preview ({statusCounts.preview})
            </TabsTrigger>
            <TabsTrigger value="draft">
              Draft ({statusCounts.draft})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Results count */}
      {searchQuery && (
        <p className="text-sm text-muted-foreground">
          Found {filteredBlogs.length} result
          {filteredBlogs.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Table */}
      {filteredBlogs.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground">
            {searchQuery
              ? 'No blogs found matching your search'
              : statusFilter !== 'all'
                ? `No ${statusFilter} blogs found`
                : 'No blogs found'}
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBlogs.map((blog) => (
                <TableRow key={blog.id}>
                  <TableCell className="font-medium max-w-xs truncate">
                    {blog.title}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {blog.slug}
                  </TableCell>
                  <TableCell>{getStatusBadge(blog)}</TableCell>
                  <TableCell>
                    {new Date(blog.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </TableCell>
                  <TableCell>
                    {new Date(blog.updatedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/blogs/${blog.slug}`} target="_blank">
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/admin/blog-management/edit/${blog.id}`}>
                        <Button variant="secondary" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <DeleteBlogDialog
                        blogId={blog.id}
                        blogTitle={blog.title}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
