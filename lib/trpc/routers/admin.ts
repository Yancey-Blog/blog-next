import { db } from '@/lib/db'
import { sessions, users } from '@/lib/db/schema'
import { SettingsService } from '@/lib/services/settings.service'
import { PRESET_THEMES, type ThemeConfig } from '@/lib/themes'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { adminProcedure } from '../init'

export const adminRouter = {
  // User management
  users: {
    list: adminProcedure.query(async () => {
      return await db.select().from(users).orderBy(users.createdAt)
    }),

    updateRole: adminProcedure
      .input(
        z.object({
          userId: z.string(),
          role: z.enum(['user', 'admin'])
        })
      )
      .mutation(async ({ input }) => {
        const [user] = await db
          .update(users)
          .set({ role: input.role })
          .where(eq(users.id, input.userId))
          .returning()

        return user
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
  theme: {
    get: adminProcedure.query(async () => {
      const themeId = await SettingsService.getCurrentTheme()
      const theme = PRESET_THEMES.find((t) => t.id === themeId)
      return theme || PRESET_THEMES[0]
    }),

    update: adminProcedure
      .input(z.object({ theme: z.custom<ThemeConfig>() }))
      .mutation(async ({ input }) => {
        await SettingsService.setCurrentTheme(input.theme.id)
        return { message: 'Theme updated successfully', theme: input.theme }
      })
  }
}
