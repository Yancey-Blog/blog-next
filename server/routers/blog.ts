import { z } from 'zod'
import { router, protectedProcedure, publicProcedure } from '../trpc'
import { BlogService } from '@/lib/services/blog.service'
import { BlogVersionService } from '@/lib/services/blog-version.service'
import { createBlogSchema, updateBlogSchema } from '@/lib/validations/blog'

export const blogRouter = router({
  // Get all blogs with pagination and filters
  list: publicProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().max(100).default(10),
        published: z.boolean().optional(),
        search: z.string().optional()
      })
    )
    .query(async ({ input }) => {
      return await BlogService.getBlogs(input)
    }),

  // Get single blog by ID
  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await BlogService.getBlogById(input.id)
    }),

  // Create new blog
  create: protectedProcedure
    .input(createBlogSchema)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new Error('User not found')
      }

      const blog = await BlogService.createBlog({
        ...input,
        authorId: ctx.user.id
      })

      // Create initial version if published
      if (input.published) {
        await BlogVersionService.createVersion(blog.id, ctx.user.id, 'Initial version')
      }

      return blog
    }),

  // Update existing blog
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: updateBlogSchema
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input

      // Get original blog to check if transitioning to published
      const originalBlog = await BlogService.getBlogById(id)
      if (!originalBlog) {
        throw new Error('Blog not found')
      }

      const wasUnpublished = !originalBlog.published
      const nowPublished = data.published === true

      const blog = await BlogService.updateBlog(id, data)

      // Create version if transitioning from draft to published
      if (wasUnpublished && nowPublished) {
        if (!ctx.user) {
          throw new Error('User not found')
        }
        await BlogVersionService.createVersion(id, ctx.user.id, 'Published')
      }

      return blog
    }),

  // Delete blog
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await BlogService.deleteBlog(input.id)
      return { message: 'Blog deleted successfully' }
    })
})
