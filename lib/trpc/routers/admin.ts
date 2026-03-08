import { db } from '@/lib/db'
import { sessions, users } from '@/lib/db/schema'
import { BlogService } from '@/lib/services/blog.service'
import { SettingsService } from '@/lib/services/settings.service'
import { PRESET_THEMES } from '@/lib/themes'
import { eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { protectedProcedure } from '../init'

export const adminRouter = {
  // Dashboard stats
  dashboard: protectedProcedure.query(async () => {
    const [stats, byMonth, chartData] = await Promise.all([
      BlogService.getStats(),
      BlogService.getBlogsByMonth(),
      BlogService.getChartData()
    ])
    return { stats, byMonth, ...chartData }
  }),

  // User management
  users: {
    list: protectedProcedure.query(async () => {
      return await db.select().from(users).orderBy(users.createdAt)
    }),

    byIds: protectedProcedure
      .input(z.object({ ids: z.array(z.string()) }))
      .query(async ({ input }) => {
        if (input.ids.length === 0) return []
        return await db.select().from(users).where(inArray(users.id, input.ids))
      }),

    delete: protectedProcedure
      .input(z.object({ userId: z.string() }))
      .mutation(async ({ input }) => {
        await db.delete(users).where(eq(users.id, input.userId))
        return { message: 'User deleted successfully' }
      })
  },

  // Session management
  sessions: {
    list: protectedProcedure.query(async () => {
      return await db
        .select({
          id: sessions.id,
          userId: sessions.userId,
          expiresAt: sessions.expiresAt,
          ipAddress: sessions.ipAddress,
          userAgent: sessions.userAgent,
          createdAt: sessions.createdAt
        })
        .from(sessions)
        .orderBy(sessions.createdAt)
    }),

    revoke: protectedProcedure
      .input(z.object({ sessionId: z.string() }))
      .mutation(async ({ input }) => {
        await db.delete(sessions).where(eq(sessions.id, input.sessionId))
        return { message: 'Session revoked successfully' }
      })
  },

  // Hero image setting
  heroImage: {
    get: protectedProcedure.query(async () => {
      return { url: await SettingsService.getHeroImage() }
    }),

    set: protectedProcedure
      .input(z.object({ url: z.string().url() }))
      .mutation(async ({ input }) => {
        await SettingsService.setHeroImage(input.url)
        return { ok: true }
      })
  },

  // Theme management
  theme: {
    get: protectedProcedure.query(async () => {
      const themeId = await SettingsService.getCurrentTheme()
      const theme = PRESET_THEMES.find((t) => t.id === themeId)
      return theme || PRESET_THEMES[0]
    }),

    update: protectedProcedure
      .input(z.object({ themeId: z.string() }))
      .mutation(async ({ input }) => {
        // Validate that theme exists
        const theme = PRESET_THEMES.find((t) => t.id === input.themeId)
        if (!theme) {
          throw new Error('Theme not found')
        }

        await SettingsService.setCurrentTheme(input.themeId)
        return { message: 'Theme updated successfully', themeId: input.themeId }
      })
  }
}
