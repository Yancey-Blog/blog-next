import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { genericOAuth, keycloak } from 'better-auth/plugins/generic-oauth'

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications
    }
  }),
  plugins: [
    genericOAuth({
      config: [
        keycloak({
          clientId: process.env.KEYCLOAK_CLIENT_ID!,
          clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
          issuer: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}`
        })
      ]
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
  ]
})

export type Session = typeof auth.$Infer.Session
