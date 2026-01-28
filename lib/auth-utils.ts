import type { User } from './db/schema'

/**
 * Check if a user is an admin based on:
 * 1. Super admin (ADMIN_EMAILS env var)
 * 2. Database role (role === 'admin')
 */
export function isAdmin(user: User | null | undefined): boolean {
  if (!user) return false

  // Method 1: Check database role
  if (user.role === 'admin') {
    return true
  }

  // Method 2: Check super admin emails from env
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((email) =>
    email.trim().toLowerCase()
  )

  if (adminEmails && adminEmails.length > 0) {
    return adminEmails.includes(user.email.toLowerCase())
  }

  return false
}

/**
 * Check if a user is a super admin (from ADMIN_EMAILS env var)
 * Super admins have full permissions including promoting other users to admin
 */
export function isSuperAdmin(user: User | null | undefined): boolean {
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
