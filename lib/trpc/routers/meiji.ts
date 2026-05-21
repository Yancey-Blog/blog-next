import { MeijiService } from '@/lib/services/meiji.service'
import {
  createMediaSchema,
  featuredTweetsSchema,
  meijiProfileSchema,
  scrapbookSchema,
  updateMediaSchema
} from '@/lib/validations/meiji'
import { z } from 'zod'
import { protectedProcedure, publicProcedure } from '../init'

export const meijiRouter = {
  // --- Profile ---
  getProfile: publicProcedure.query(async () => {
    return MeijiService.getProfile()
  }),

  updateProfile: protectedProcedure
    .input(meijiProfileSchema)
    .mutation(async ({ input }) => {
      await MeijiService.updateProfile(input)
      return { ok: true }
    }),

  // --- Media feed ---
  listMedia: publicProcedure.query(async () => {
    return MeijiService.listMedia()
  }),

  createMedia: protectedProcedure
    .input(createMediaSchema)
    .mutation(async ({ input }) => {
      return MeijiService.createMedia(input)
    }),

  updateMedia: protectedProcedure
    .input(z.object({ id: z.string(), data: updateMediaSchema }))
    .mutation(async ({ input }) => {
      return MeijiService.updateMedia(input.id, input.data)
    }),

  deleteMedia: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await MeijiService.deleteMedia(input.id)
      return { ok: true }
    }),

  // --- Featured tweets ---
  getFeaturedTweets: publicProcedure.query(async () => {
    return MeijiService.getFeaturedTweets()
  }),

  setFeaturedTweets: protectedProcedure
    .input(featuredTweetsSchema)
    .mutation(async ({ input }) => {
      await MeijiService.setFeaturedTweets(input)
      return { ok: true }
    }),

  // --- Scrapbook ---
  getScrapbook: publicProcedure.query(async () => {
    return MeijiService.getScrapbook()
  }),

  setScrapbook: protectedProcedure
    .input(scrapbookSchema)
    .mutation(async ({ input }) => {
      await MeijiService.setScrapbook(input)
      return { ok: true }
    })
}
