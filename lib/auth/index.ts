import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { createAuthMiddleware } from 'better-auth/api'
import { eq } from 'drizzle-orm'

// Get admin emails from environment variable
function getAdminEmails(): string[] {
  const emails = process.env.ADMIN_EMAILS || ''
  return emails
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications
    }
  }),
  emailAndPassword: {
    enabled: false // We only use OAuth
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!
    }
  },
  trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'],
  // Hook to restrict access to admin emails only
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      const newSession = ctx.context.newSession
      // Check if this is an OAuth sign-in
      if (ctx.path === '/sign-in/social' && newSession?.user) {
        const adminEmails = getAdminEmails()
        const userEmail = newSession.user.email.toLowerCase()

        // If user email is not in admin list, delete the session
        if (!adminEmails.includes(userEmail)) {
          console.log(
            `Unauthorized login attempt by ${userEmail}. Allowed emails:`,
            adminEmails
          )

          // Delete the session to prevent unauthorized access
          if (newSession) {
            await db
              .delete(schema.sessions)
              .where(eq(schema.sessions.id, newSession.session.id))
          }

          // Delete the user account if it was just created
          await db
            .delete(schema.users)
            .where(eq(schema.users.id, newSession.session.id))

          throw new Error(
            'Access denied. Only authorized administrators can access this system.'
          )
        }
      }
    })
  }
})

export type Session = typeof auth.$Infer.Session
