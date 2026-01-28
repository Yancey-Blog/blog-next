import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { getAdminEmails } from './auth-utils'
import { eq } from 'drizzle-orm'

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
  hooks: {
    after: [
      {
        matcher: () => true,
        handler: async (ctx) => {
          // Auto-assign admin role to whitelisted emails on first login
          if (ctx.context && ctx.context.newUser && ctx.user) {
            const adminEmails = getAdminEmails()
            if (adminEmails.includes(ctx.user.email.toLowerCase())) {
              await db
                .update(schema.users)
                .set({ role: 'admin' })
                .where(eq(schema.users.id, ctx.user.id))
            }
          }
        }
      }
    ]
  }
})

export type Session = typeof auth.$Infer.Session
