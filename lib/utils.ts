import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Turns user search input into an ILIKE "contains" pattern: trims it and
 * escapes `\`, `%` and `_` so they match literally. Returns null for blank input.
 */
export function toContainsPattern(input: string | undefined): string | null {
  const term = input?.trim()
  if (!term) return null
  return `%${term.replace(/[\\%_]/g, '\\$&')}%`
}
