import { db } from '@/lib/db'
import { meijiMedia, type MeijiMedia } from '@/lib/db/schema'
import { SettingsService } from '@/lib/services/settings.service'
import type {
  CreateMediaInput,
  MeijiProfile,
  ScrapbookItem,
  UpdateMediaInput
} from '@/lib/validations/meiji'
import { desc, eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

const PROFILE_KEY = 'meiji_profile'
const SCRAPBOOK_KEY = 'meiji_scrapbook'

const DEFAULT_PROFILE: MeijiProfile = {
  name: '明治',
  gender: 'Boy',
  breed: 'Blue Golden Shaded British Shorthair',
  birthday: '2026-03-05',
  bio: 'ぼく、明治。A little British gentleman in a blue-golden coat. Professional napper, part-time zoomie athlete, full-time floof. Follow my tiny adventures (and snack reviews) here and on X.',
  avatarUrl: '',
  xHandle: 'meiji_20260305'
}

export class MeijiService {
  // --- Profile (settings) ---
  static async getProfile(): Promise<MeijiProfile> {
    const stored = await SettingsService.get<MeijiProfile>(PROFILE_KEY)
    return { ...DEFAULT_PROFILE, ...(stored ?? {}) }
  }

  static async updateProfile(profile: MeijiProfile): Promise<void> {
    await SettingsService.set(PROFILE_KEY, profile, 'Meiji cat profile')
  }

  // --- Media feed (table) ---
  static async listMedia(): Promise<MeijiMedia[]> {
    return db.select().from(meijiMedia).orderBy(desc(meijiMedia.takenAt))
  }

  static async createMedia(data: CreateMediaInput): Promise<MeijiMedia> {
    const [created] = await db
      .insert(meijiMedia)
      .values({
        id: uuidv4(),
        type: data.type,
        url: data.url,
        caption: data.caption ?? null,
        milestone: data.milestone ?? null,
        takenAt: data.takenAt ?? new Date()
      })
      .returning()
    return created
  }

  static async updateMedia(
    id: string,
    data: UpdateMediaInput
  ): Promise<MeijiMedia | null> {
    const [updated] = await db
      .update(meijiMedia)
      .set({
        ...(data.type !== undefined && { type: data.type }),
        ...(data.url !== undefined && { url: data.url }),
        ...(data.caption !== undefined && { caption: data.caption ?? null }),
        ...(data.milestone !== undefined && {
          milestone: data.milestone ?? null
        }),
        ...(data.takenAt !== undefined && { takenAt: data.takenAt })
      })
      .where(eq(meijiMedia.id, id))
      .returning()
    return updated ?? null
  }

  static async deleteMedia(id: string): Promise<boolean> {
    const result = await db
      .delete(meijiMedia)
      .where(eq(meijiMedia.id, id))
      .returning()
    return result.length > 0
  }

  // --- Scrapbook (settings) ---
  static async getScrapbook(): Promise<ScrapbookItem[]> {
    return (await SettingsService.get<ScrapbookItem[]>(SCRAPBOOK_KEY)) ?? []
  }

  static async setScrapbook(items: ScrapbookItem[]): Promise<void> {
    await SettingsService.set(SCRAPBOOK_KEY, items, 'Meiji hero scrapbook')
  }
}
