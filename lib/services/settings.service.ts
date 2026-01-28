import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

export class SettingsService {
  /**
   * Get a setting by key
   */
  static async get<T = any>(key: string): Promise<T | null> {
    const [setting] = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, key))
      .limit(1)

    if (!setting) return null

    try {
      return JSON.parse(setting.value) as T
    } catch {
      return setting.value as T
    }
  }

  /**
   * Set a setting value
   */
  static async set<T = any>(
    key: string,
    value: T,
    description?: string
  ): Promise<void> {
    const valueString =
      typeof value === 'string' ? value : JSON.stringify(value)

    const existing = await this.get(key)

    if (existing !== null) {
      // Update existing
      await db
        .update(schema.settings)
        .set({
          value: valueString,
          ...(description && { description }),
          updatedAt: new Date()
        })
        .where(eq(schema.settings.key, key))
    } else {
      // Insert new
      await db.insert(schema.settings).values({
        id: uuidv4(),
        key,
        value: valueString,
        description: description || null
      })
    }
  }

  /**
   * Delete a setting
   */
  static async delete(key: string): Promise<void> {
    await db.delete(schema.settings).where(eq(schema.settings.key, key))
  }

  /**
   * Get all settings
   */
  static async getAll(): Promise<Record<string, any>> {
    const settings = await db.select().from(schema.settings)

    const result: Record<string, any> = {}

    for (const setting of settings) {
      try {
        result[setting.key] = JSON.parse(setting.value)
      } catch {
        result[setting.key] = setting.value
      }
    }

    return result
  }

  /**
   * Get current theme
   */
  static async getCurrentTheme(): Promise<string> {
    const theme = await this.get<string>('theme')
    return theme || 'default'
  }

  /**
   * Set current theme
   */
  static async setCurrentTheme(themeId: string): Promise<void> {
    await this.set('theme', themeId, 'Current active theme')
  }
}
