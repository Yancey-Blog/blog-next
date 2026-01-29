import { auth } from '@/lib/auth'
import { User } from '@/lib/db/schema'
import { headers } from 'next/headers'

export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers()
  })

  return session
}

export async function requireAuth() {
  const session = await getSession()

  if (!session) {
    throw new Error('Unauthorized')
  }

  return session
}

/**
 * Get the current user with proper type casting including role field
 */
export function getSessionUser(
  session: Awaited<ReturnType<typeof getSession>>
): User | null {
  if (!session?.user) return null

  return {
    ...session.user,
    role: (session.user as any).role || 'user',
    image: session.user.image ?? null
  } as User
}
