import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { BlogVersionService } from '@/lib/services/blog-version.service'
import { BlogService } from '@/lib/services/blog.service'
import { DiffService } from '@/lib/services/diff.service'

export const versionRouter = router({
  // Get all versions for a blog
  list: protectedProcedure
    .input(z.object({ blogId: z.string() }))
    .query(async ({ input }) => {
      return await BlogVersionService.getVersions(input.blogId)
    }),

  // Get a specific version
  byId: protectedProcedure
    .input(
      z.object({
        blogId: z.string(),
        versionId: z.string()
      })
    )
    .query(async ({ input }) => {
      return await BlogVersionService.getVersion(input.versionId)
    }),

  // Get diff between two versions
  diff: protectedProcedure
    .input(
      z.object({
        blogId: z.string(),
        versionId1: z.string(),
        versionId2: z.string()
      })
    )
    .query(async ({ input }) => {
      const [version1, version2] = await Promise.all([
        BlogVersionService.getVersion(input.versionId1),
        BlogVersionService.getVersion(input.versionId2)
      ])

      if (!version1 || !version2) {
        throw new Error('Version not found')
      }

      return DiffService.compareBlogVersions(version1, version2)
    }),

  // Restore a version
  restore: protectedProcedure
    .input(
      z.object({
        blogId: z.string(),
        versionId: z.string()
      })
    )
    .mutation(async ({ input }) => {
      const version = await BlogVersionService.getVersion(input.versionId)

      if (!version) {
        throw new Error('Version not found')
      }

      await BlogService.updateBlog(input.blogId, {
        title: version.title,
        content: version.content,
        summary: version.summary ?? undefined,
        coverImage: version.coverImage ?? undefined
      })

      return { message: 'Version restored successfully' }
    })
})
