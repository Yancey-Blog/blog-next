'use client'

import type { Blog } from '@/lib/db/schema'
import { Edit, ExternalLink, Search } from 'lucide-react'
import Link from 'next/link'
import { DeleteBlogDialog } from './delete-blog-dialog'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Pagination } from './ui/pagination'
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
  pagination?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  searchQuery: string
  statusFilter: 'all' | 'published' | 'draft'
  onSearchChange: (query: string) => void
  onStatusFilterChange: (filter: 'all' | 'published' | 'draft') => void
  onPageChange?: (page: number) => void // Optional now since we use URL query
  isLoading?: boolean
}

export function BlogListTable({
  blogs,
  pagination,
  searchQuery,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  onPageChange,
  isLoading
}: BlogListTableProps) {
  const getStatusBadge = (blog: Blog) => {
    if (blog.published) {
      return (
        <Badge className="bg-green-500 hover:bg-green-600">Published</Badge>
      )
    }
    return <Badge variant="secondary">Draft</Badge>
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title..."
            value={searchQuery}
            onChange={(e) => {
              onSearchChange(e.target.value)
              onPageChange?.(1) // Reset to first page on search
            }}
            className="pl-9"
            disabled={isLoading}
          />
        </div>

        <Tabs
          value={statusFilter}
          onValueChange={(value) => {
            onStatusFilterChange(value as 'all' | 'published' | 'draft')
            onPageChange?.(1) // Reset to first page on filter change
          }}
        >
          <TabsList>
            <TabsTrigger value="all" disabled={isLoading}>
              All
            </TabsTrigger>
            <TabsTrigger value="published" disabled={isLoading}>
              Published
            </TabsTrigger>
            <TabsTrigger value="draft" disabled={isLoading}>
              Draft
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Table */}
      {blogs.length === 0 ? (
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
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blogs.map((blog) => (
                  <TableRow key={blog.id}>
                    <TableCell className="font-medium max-w-xs truncate">
                      {blog.title}
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
                        {blog.published && (
                          <Link href={`/post/${blog.id}`} target="_blank">
                            <Button variant="outline" size="sm">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
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

          {/* Pagination */}
          {pagination && (
            <div className='flex items-center justify-between'>
              {/* Results count */}
              <p className="text-sm text-muted-foreground">
                Showing{' '}
                {blogs.length === 0
                  ? 0
                  : (pagination.page - 1) * pagination.pageSize + 1}{' '}
                to{' '}
                {Math.min(
                  pagination.page * pagination.pageSize,
                  pagination.total
                )}{' '}
                of {pagination.total} result
                {pagination.total !== 1 ? 's' : ''}
              </p>
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                useUrlQuery
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
