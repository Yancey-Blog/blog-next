import { headers } from 'next/headers'

import { auth } from '@/lib/auth'

import { isAdminUser } from './access'

export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers()
  })

  return session && isAdminUser(session.user) ? session : null
}

export async function requireAuth() {
  const session = await getSession()

  if (!session) {
    throw new Error('Unauthorized')
  }

  return session
}
