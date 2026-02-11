import { db } from '@/lib/db'
import { sessions, users } from '@/lib/db/schema'
import { SettingsService } from '@/lib/services/settings.service'
import { PRESET_THEMES } from '@/lib/themes'
import { eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { adminProcedure, publicProcedure } from '../init'

export const adminRouter = {
  // User management
  users: {
    list: adminProcedure.query(async () => {
      return await db.select().from(users).orderBy(users.createdAt)
    }),

    byIds: publicProcedure
      .input(z.object({ ids: z.array(z.string()) }))
      .query(async ({ input }) => {
        if (input.ids.length === 0) return []
        return await db.select().from(users).where(inArray(users.id, input.ids))
      }),

    delete: adminProcedure
      .input(z.object({ userId: z.string() }))
      .mutation(async ({ input }) => {
        await db.delete(users).where(eq(users.id, input.userId))
        return { message: 'User deleted successfully' }
      })
  },

  // Session management
  sessions: {
    list: adminProcedure.query(async () => {
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

    revoke: adminProcedure
      .input(z.object({ sessionId: z.string() }))
      .mutation(async ({ input }) => {
        await db.delete(sessions).where(eq(sessions.id, input.sessionId))
        return { message: 'Session revoked successfully' }
      })
  },

  // Theme management
  getCurrentTheme: adminProcedure.query(async () => {
    return await SettingsService.getCurrentTheme()
  }),

  theme: {
    get: adminProcedure.query(async () => {
      const themeId = await SettingsService.getCurrentTheme()
      const theme = PRESET_THEMES.find((t) => t.id === themeId)
      return theme || PRESET_THEMES[0]
    }),

    update: adminProcedure
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
