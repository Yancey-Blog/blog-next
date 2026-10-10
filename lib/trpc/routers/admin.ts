import { TRPCError } from '@trpc/server'
import { eq, inArray } from 'drizzle-orm'
import { z } from 'zod'

import { DEFAULT_AI_MODEL, listOpenAIChatModels } from '@/lib/ai/models'
import { db } from '@/lib/db'
import { sessions, users } from '@/lib/db/schema'
import { BlogService } from '@/lib/services/blog.service'
import { SettingsService } from '@/lib/services/settings.service'
import { PRESET_THEMES } from '@/lib/themes'

import { protectedProcedure } from '../init'

const openSourceProjectSchema = z.object({
  name: z.string().min(1),
  logo: z.string().url(),
  link: z.string().url(),
  description: z.string()
})

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

  // OpenAI model for the editor AI
  aiModel: {
    get: protectedProcedure.query(async () => {
      return {
        model: await SettingsService.getAIModel(),
        defaultModel: DEFAULT_AI_MODEL
      }
    }),

    // Live list from OpenAI, so new models show up without a deploy.
    list: protectedProcedure.query(async () => {
      try {
        const models = await listOpenAIChatModels()
        return models.map((m) => ({
          id: m.id,
          created: m.created,
          retiring: m.shutdown_date != null
        }))
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_GATEWAY',
          message:
            error instanceof Error ? error.message : 'Failed to list models'
        })
      }
    }),

    set: protectedProcedure
      .input(z.object({ model: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const models = await listOpenAIChatModels()
        if (!models.some((m) => m.id === input.model)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Unknown model: ${input.model}`
          })
        }
        await SettingsService.setAIModel(input.model)
        return { ok: true }
      })
  },

  // Open source projects
  openSource: {
    get: protectedProcedure.query(async () => {
      return await SettingsService.getOpenSourceProjects()
    }),

    set: protectedProcedure
      .input(z.array(openSourceProjectSchema).max(3))
      .mutation(async ({ input }) => {
        await SettingsService.setOpenSourceProjects(input)
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
