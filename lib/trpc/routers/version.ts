import { z } from 'zod'

import { BlogVersionService } from '@/lib/services/blog-version.service'
import { DiffService } from '@/lib/services/diff.service'

import { protectedProcedure, publicProcedure } from '../init'

export const versionRouter = {
  // Get all versions for a blog
  list: publicProcedure
    .input(z.object({ blogId: z.string() }))
    .query(async ({ input }) => {
      return await BlogVersionService.getVersions(input.blogId)
    }),

  // Get a specific version
  byId: publicProcedure
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
  diff: publicProcedure
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
    .mutation(async ({ input, ctx }) => {
      await BlogVersionService.restoreVersion(
        input.blogId,
        input.versionId,
        ctx.user.id
      )

      return { message: 'Version restored successfully' }
    })
}
