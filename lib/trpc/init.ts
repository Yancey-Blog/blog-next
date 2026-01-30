import { getSession, getSessionUser } from '@/lib/session'
import { initTRPC } from '@trpc/server'
import { cache } from 'react'
import superjson from 'superjson'

export const createTRPCContext = cache(async () => {
  /**
   * @see: https://trpc.io/docs/server/context
   */
  const session = await getSession()
  const user = getSessionUser(session)

  return {
    session,
    user // Properly typed User object with role field
    // headers: opts.req.headers
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
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new Error('UNAUTHORIZED')
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user // User is already properly typed from context
    }
  })
})

/**
 * Admin-only procedure
 */
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new Error('FORBIDDEN')
  }
  return next({ ctx })
})
