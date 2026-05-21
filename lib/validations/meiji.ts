import { z } from 'zod'

export const meijiProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  gender: z.string().max(50),
  breed: z.string().max(150),
  birthday: z.string().max(30), // ISO date string, e.g. 2026-03-05
  bio: z.string().max(2000),
  avatarUrl: z.string(),
  xHandle: z.string().max(50)
})

export const createMediaSchema = z.object({
  type: z.enum(['photo', 'video']),
  url: z.url('A valid media URL is required'),
  caption: z.string().max(300).nullable().optional(),
  milestone: z.string().max(50).nullable().optional(),
  takenAt: z.coerce.date().optional()
})

export const updateMediaSchema = createMediaSchema.partial()

export const featuredTweetSchema = z.object({
  url: z.url('A valid tweet URL is required'),
  note: z.string().max(200).optional()
})

export const featuredTweetsSchema = z.array(featuredTweetSchema).max(50)

// Hero scrapbook polaroids — layout (position/rotation/parallax) is a fixed
// design preset; only the photo + caption of each of the N slots is editable.
export const SCRAPBOOK_SLOT_COUNT = 6

export const scrapbookItemSchema = z.object({
  imageUrl: z.string(),
  caption: z.string().max(60)
})

export const scrapbookSchema = z
  .array(scrapbookItemSchema)
  .max(SCRAPBOOK_SLOT_COUNT)

export type MeijiProfile = z.infer<typeof meijiProfileSchema>
export type CreateMediaInput = z.infer<typeof createMediaSchema>
export type UpdateMediaInput = z.infer<typeof updateMediaSchema>
export type FeaturedTweet = z.infer<typeof featuredTweetSchema>
export type ScrapbookItem = z.infer<typeof scrapbookItemSchema>

/**
 * Extract the numeric status id from an X/Twitter status URL.
 * Accepts twitter.com or x.com, with or without query/trailing parts.
 * Returns null if no status id is found.
 */
export function parseTweetId(url: string): string | null {
  const match = url.match(
    /(?:twitter\.com|x\.com)\/[^/]+\/status(?:es)?\/(\d+)/
  )
  return match ? match[1] : null
}
