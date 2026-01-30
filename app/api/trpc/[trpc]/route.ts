// import { appRouter } from '@/server'
// import { createContext } from '@/server/context'
// import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
// import { type NextRequest } from 'next/server'

// const handler = (req: NextRequest) =>
//   fetchRequestHandler({
//     endpoint: '/api/trpc',
//     req,
//     router: appRouter,
//     createContext
//   })

// export { handler as GET, handler as POST }

import { createTRPCContext } from '@/lib/trpc/init'
import { appRouter } from '@/lib/trpc/routers/_app'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: createTRPCContext
  })
export { handler as GET, handler as POST }
