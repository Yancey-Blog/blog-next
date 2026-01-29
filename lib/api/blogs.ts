import { apiClient } from '@/lib/api-client'
import type { Blog } from '@/lib/db/schema'

export interface GetBlogsParams {
  page?: number
  pageSize?: number
  published?: boolean
  search?: string
}

export interface GetBlogsResponse {
  data: Blog[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface CreateBlogData {
  title: string
  content: string
  summary?: string
  coverImage?: string
  published: boolean
}

export type UpdateBlogData = Partial<CreateBlogData>

export const blogsApi = {
  // Get blogs list
  getBlogs: (params?: GetBlogsParams) =>
    apiClient.get<GetBlogsResponse>('/api/blogs', { params }),

  // Get single blog
  getBlog: (id: string) => apiClient.get<Blog>(`/api/blogs/${id}`),

  // Create blog
  createBlog: (data: CreateBlogData) =>
    apiClient.post<Blog>('/api/blogs', data),

  // Update blog
  updateBlog: (id: string, data: UpdateBlogData) =>
    apiClient.patch<Blog>(`/api/blogs/${id}`, data),

  // Delete blog
  deleteBlog: (id: string) =>
    apiClient.delete<{ message: string }>(`/api/blogs/${id}`)
}
