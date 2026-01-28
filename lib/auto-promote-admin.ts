import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getAdminEmails } from './auth-utils'

/**
 * Auto-promote super admins (from ADMIN_EMAILS) to admin role
 * Call this after successful login
 */
export async function autoPromoteAdmin(userId: string, userEmail: string) {
  try {
    const adminEmails = getAdminEmails()

    // Check if user's email is in the super admin list
    if (adminEmails.includes(userEmail.toLowerCase())) {
      // Get current user data
      const [user] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1)

      // Only update if not already admin
      if (user && user.role !== 'admin') {
        await db
          .update(schema.users)
          .set({ role: 'admin' })
          .where(eq(schema.users.id, userId))

        console.log(`Auto-promoted user ${userEmail} to admin role`)
      }
    }
  } catch (error) {
    console.error('Error auto-promoting admin:', error)
    // Don't throw - this is not critical
  }
}
