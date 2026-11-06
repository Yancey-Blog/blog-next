import type { BetterAuthOptions } from 'better-auth'
import { APIError } from 'better-auth/api'

import { isAdminEmail, isAdminUser } from './access'

type Identity = { email?: string | null; emailVerified?: boolean }
export function assertAdminIdentity(user: Identity | null | undefined): void {
  if (!isAdminUser(user))
    throw new APIError('FORBIDDEN', {
      message: 'Only authorized administrators can access this system.'
    })
}
/** Gates run before persistence, independently of the OAuth/passkey endpoint path. */
export function adminDatabaseHooks(
  findUser: (id: string) => Promise<Identity | undefined>
) {
  return {
    user: {
      create: {
        before: (user) => {
          assertAdminIdentity(user)
          return Promise.resolve({ data: user })
        }
      },
      update: {
        before: (data) => {
          if (
            (data.email !== undefined && !isAdminEmail(data.email)) ||
            data.emailVerified === false
          )
            throw new APIError('FORBIDDEN', {
              message:
                'Administrator identity cannot be changed to an unauthorized account.'
            })
          return Promise.resolve({ data })
        }
      }
    },
    session: {
      create: {
        before: async (session) => {
          assertAdminIdentity(await findUser(session.userId))
          return { data: session }
        }
      }
    }
  } satisfies NonNullable<BetterAuthOptions['databaseHooks']>
}
