import type { User } from './db/schema'

/**
 * Check if a user is an admin based on email whitelist
 */
export function isAdmin(user: User | null | undefined): boolean {
  if (!user) return false

  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((email) =>
    email.trim().toLowerCase()
  )

  if (adminEmails && adminEmails.length > 0) {
    return adminEmails.includes(user.email.toLowerCase())
  }

  return false
}

/**
 * Get admin emails from environment variable
 */
export function getAdminEmails(): string[] {
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((email) =>
    email.trim().toLowerCase()
  )
  return adminEmails || []
}
