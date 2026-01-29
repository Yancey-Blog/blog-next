import { z } from 'zod'

export const createBlogSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),
  content: z.string().min(1, 'Content is required'),
  summary: z
    .string()
    .max(500, 'Summary must be less than 500 characters'),
  coverImage: z.url('Cover image must be a valid URL'),
  published: z.boolean().default(false)
})

export const updateBlogSchema = createBlogSchema.partial()

export const getBlogsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(10),
  published: z.coerce.boolean().optional(),
  search: z.string().optional()
})

export type CreateBlogInput = z.infer<typeof createBlogSchema>
export type UpdateBlogInput = z.infer<typeof updateBlogSchema>
export type GetBlogsQuery = z.infer<typeof getBlogsQuerySchema>
