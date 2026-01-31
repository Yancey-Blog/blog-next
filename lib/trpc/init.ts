import { getSession } from '@/lib/auth/session'
import { initTRPC } from '@trpc/server'
import { cache } from 'react'
import superjson from 'superjson'

export const createTRPCContext = cache(async () => {
  /**
   * @see: https://trpc.io/docs/server/context
   */
  const session = await getSession()

  return {
    session,
    user: session?.user // User from session (all logged-in users are admins)
  }
})

// Infer context type from the context function
type Context = Awaited<ReturnType<typeof createTRPCContext>>

// Avoid exporting the entire t-object
// since it's not very descriptive.
// For instance, the use of a t variable
// is common in i18n libraries.
const t = initTRPC.context<Context>().create({
  /**
   * @see https://trpc.io/docs/server/data-transformers
   */
  transformer: superjson
})

// Base router and procedure helpers
export const createTRPCRouter = t.router
export const createCallerFactory = t.createCallerFactory
export const publicProcedure = t.procedure

/**
 * Protected procedure that requires authentication
 * Since only admin emails can login, all authenticated users are admins
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new Error('UNAUTHORIZED')
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user // User is guaranteed to exist and be an admin
    }
  })
})

/**
 * Alias for protectedProcedure
 * All authenticated users are admins in this system
 */
export const adminProcedure = protectedProcedure
