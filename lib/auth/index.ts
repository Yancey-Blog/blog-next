import { passkey } from '@better-auth/passkey'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { eq } from 'drizzle-orm'
import { importPKCS8, SignJWT } from 'jose'

import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'

import { adminDatabaseHooks, assertAdminIdentity } from './provisioning'

const publicAppURL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const authBaseURL =
  process.env.VERCEL_ENV === 'production'
    ? 'https://www.yanceyleo.com'
    : process.env.BETTER_AUTH_URL || publicAppURL

const trustedOrigins = [
  'https://appleid.apple.com',
  authBaseURL,
  publicAppURL,
  publicAppURL.replace('://www.', '://'),
  publicAppURL.replace('://', '://www.'),
  'https://yanceyleo.com',
  'https://www.yanceyleo.com',
  'https://yancey.app',
  'https://www.yancey.app'
]

// Generate the client secret JWT required for 'Sign in with Apple'.
async function generateAppleClientSecret(
  clientId: string,
  teamId: string,
  keyId: string,
  privateKey: string
): Promise<string> {
  const key = await importPKCS8(
    privateKey
      .trim()
      .replace(/^["']|["']$/g, '')
      .replace(/\\n/g, '\n'),
    'ES256'
  )
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setSubject(clientId)
    .setAudience('https://appleid.apple.com')
    .setIssuedAt(now)
    .setExpirationTime(now + 180 * 24 * 60 * 60)
    .sign(key)
}

export const auth = betterAuth({
  baseURL: authBaseURL,
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
    },
    apple: async () => ({
      clientId: process.env.APPLE_CLIENT_ID as string,
      clientSecret: await generateAppleClientSecret(
        process.env.APPLE_CLIENT_ID!,
        process.env.APPLE_TEAM_ID!,
        process.env.APPLE_KEY_ID!,
        process.env.APPLE_PRIVATE_KEY!
      )
    })
  },
  plugins: [
    passkey({
      rpID: new URL(authBaseURL).hostname,
      rpName: 'Yancey Blog'
    })
  ],
  trustedOrigins: [...new Set(trustedOrigins)],
  user: {
    validateUserInfo: ({ user }) => {
      assertAdminIdentity(user)
    }
  },
  databaseHooks: adminDatabaseHooks(async (id) => {
    const [user] = await db
      .select({
        email: schema.users.email,
        emailVerified: schema.users.emailVerified
      })
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1)
    return user
  })
})

export type Session = typeof auth.$Infer.Session
