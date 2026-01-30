import { QueryClient, defaultShouldDehydrateQuery } from '@tanstack/react-query'
import superjson from 'superjson'

/**
 * Create a stable QueryClient instance for server-side rendering
 */
export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 30 * 1000, // 30 seconds
        refetchOnWindowFocus: false,
        retry: 1
      },
      dehydrate: {
        serializeData: superjson.serialize,
        // Include pending queries in dehydrated state
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === 'pending'
      },
      hydrate: {
        deserializeData: superjson.deserialize
      }
    }
  })
