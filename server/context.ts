import { getSession, getSessionUser } from '@/lib/session'
import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'

/**
 * Creates context for an incoming request
 * @link https://trpc.io/docs/server/context
 */
export async function createContext(opts: FetchCreateContextFnOptions) {
  const session = await getSession()
  const user = getSessionUser(session)

  return {
    session,
    user, // Properly typed User object with role field
    headers: opts.req.headers
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>
