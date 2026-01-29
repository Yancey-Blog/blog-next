import {
  blogsApi,
  type CreateBlogData,
  type GetBlogsParams,
  type UpdateBlogData
} from '@/lib/api/blogs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Query keys
export const blogKeys = {
  all: ['blogs'] as const,
  lists: () => [...blogKeys.all, 'list'] as const,
  list: (params?: GetBlogsParams) => [...blogKeys.lists(), params] as const,
  details: () => [...blogKeys.all, 'detail'] as const,
  detail: (id: string) => [...blogKeys.details(), id] as const
}

// Get blogs list with pagination and filters
export function useBlogs(params?: GetBlogsParams) {
  return useQuery({
    queryKey: blogKeys.list(params),
    queryFn: () => blogsApi.getBlogs(params)
  })
}

// Get single blog by ID
export function useBlog(id: string, enabled = true) {
  return useQuery({
    queryKey: blogKeys.detail(id),
    queryFn: () => blogsApi.getBlog(id),
    enabled: enabled && !!id
  })
}

// Create new blog
export function useCreateBlog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateBlogData) => blogsApi.createBlog(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogKeys.lists() })
    }
  })
}

// Update existing blog
export function useUpdateBlog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBlogData }) =>
      blogsApi.updateBlog(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: blogKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: blogKeys.lists() })
    }
  })
}

// Delete blog
export function useDeleteBlog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => blogsApi.deleteBlog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogKeys.lists() })
    }
  })
}
