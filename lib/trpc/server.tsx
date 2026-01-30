import 'server-only'

import { appRouter } from '@/server'
import { createContext } from '@/server/context'
import { createCallerFactory } from '@/server/trpc'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query'
import { headers } from 'next/headers'
import { cache } from 'react'
import { makeQueryClient } from './query-client-server'

// Create a stable query client for server-side rendering
export const getQueryClient = cache(makeQueryClient)

/**
 * Create context for server components
 * Uses Next.js headers() instead of fetch request
 */
const createServerContext = async () => {
  const headersList = await headers()
  return createContext({
    req: {
      headers: headersList
    },
    resHeaders: new Headers(),
    info: {}
  })
}

/**
 * Main tRPC proxy for server components
 * Used for prefetching queries on the server
 */
export const trpc = createTRPCOptionsProxy({
  ctx: createServerContext,
  router: appRouter,
  queryClient: getQueryClient
})

/**
 * Helper component to hydrate client with server-fetched data
 */
export function HydrateClient(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient()
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {props.children}
    </HydrationBoundary>
  )
}

// Create a caller for server-side data fetching (bypasses query cache)
const createCaller = createCallerFactory(appRouter)

/**
 * Server-side tRPC caller for direct API calls in Server Components
 * This bypasses the query cache and directly calls the router
 */
export const serverClient = cache(async () => {
  return createCaller(await createServerContext())
})
