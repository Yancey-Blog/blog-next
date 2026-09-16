import { passkey } from '@better-auth/passkey'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { createAuthMiddleware } from 'better-auth/api'
import { eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'

// Get admin emails from environment variable
function getAdminEmails(): string[] {
  const emails = process.env.ADMIN_EMAILS || ''
  return emails
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
      passkey: schema.passkeys
    }
  }),
  emailAndPassword: {
    enabled: false // We only use OAuth
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      accessType: 'offline',
      prompt: 'select_account consent'
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!
    }
  },
  plugins: [
    passkey({
      rpID: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
        .hostname,
      rpName: 'Yancey Blog'
    })
  ],
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    ...(process.env.NEXT_PUBLIC_APP_URL
      ? [
          process.env.NEXT_PUBLIC_APP_URL.replace('://www.', '://'),
          process.env.NEXT_PUBLIC_APP_URL.replace('://', '://www.')
        ]
      : [])
  ],
  // Hook to restrict access to admin emails only
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      const newSession = ctx.context.newSession
      // Re-check the whitelist on every path that establishes a session
      // (OAuth sign-in, and passkey sign-in), so removing an email from
      // ADMIN_EMAILS revokes a previously-registered passkey too.
      const isNewLogin =
        ctx.path === '/sign-in/social' ||
        ctx.path === '/passkey/verify-authentication'

      if (isNewLogin && newSession?.user) {
        const adminEmails = getAdminEmails()
        const userEmail = newSession.user.email.toLowerCase()

        // If user email is not in admin list, revoke session and delete user
        if (!adminEmails.includes(userEmail)) {
          await db
            .delete(schema.sessions)
            .where(eq(schema.sessions.id, newSession.session.id))

          await db
            .delete(schema.users)
            .where(eq(schema.users.id, newSession.user.id))

          throw new Error(
            'Access denied. Only authorized administrators can access this system.'
          )
        }
      }
    })
  }
})

export type Session = typeof auth.$Infer.Session
