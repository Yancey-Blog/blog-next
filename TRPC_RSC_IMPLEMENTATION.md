# tRPC React Server Components Implementation

## Overview

Implemented tRPC with React Server Components support using `@trpc/tanstack-react-query` following the official tRPC RSC documentation.

## Changes Made

### 1. Package Installation

```bash
pnpm add -w @trpc/tanstack-react-query@^11.9.0
```

### 2. File Structure

```
lib/trpc/
├── client.tsx              # Client-side provider with singleton QueryClient
├── server.tsx              # Server-side helpers for RSC
├── query-client.ts         # Shared QueryClient factory with dehydration config
└── query-client-server.ts  # Server-side cached QueryClient factory
```

### 3. Key Files

#### `lib/trpc/query-client.ts`
- Shared QueryClient factory with superjson serialization
- Dehydration/hydration support for SSR
- 30-second stale time for performance
- Includes pending queries in dehydrated state

#### `lib/trpc/client.tsx` (Client Component)
- Exports `trpc` hooks for use in Client Components
- Exports `TRPCProvider` wrapper with QueryClientProvider
- Singleton pattern for browser QueryClient (prevents recreation on re-renders)
- Always creates new QueryClient on server side
- Includes React Query DevTools

#### `lib/trpc/server.tsx` (Server-Only)
- Exports `trpc` proxy for server-side prefetching
- Exports `HydrateClient` component for data hydration
- Exports `serverClient` for direct tRPC calls (bypasses cache)
- Exports `getQueryClient` for accessing QueryClient in Server Components
- Uses Next.js `headers()` for context creation

#### `lib/trpc/query-client-server.ts` (Server-Only)
- Cached QueryClient factory using React's `cache()`
- Ensures single QueryClient per request

### 4. Layout Updates

Updated all three layout files to import from the new location:

- `app/(cms)/layout.tsx` - ✅ Updated
- `app/(auth)/layout.tsx` - ✅ Updated
- `app/(frontend)/layout.tsx` - ✅ Updated

Changed from:
```typescript
import { TRPCProvider } from '@/lib/trpc/Provider'
```

To:
```typescript
import { TRPCProvider } from '@/lib/trpc/client'
```

### 5. Deleted Files

- `lib/trpc/Provider.tsx` - Replaced by `client.tsx`
- `lib/trpc/client.ts` - Old hooks file (conflicted with new `client.tsx`)

## Usage Patterns

### Client Components

```typescript
'use client'
import { trpc } from '@/lib/trpc/client'

export function MyComponent() {
  const { data, isLoading } = trpc.blog.list.useQuery({ page: 1 })
  const createBlog = trpc.blog.create.useMutation()

  // ... use hooks as before
}
```

### Server Components (Prefetch + Hydrate)

```typescript
import { trpc, HydrateClient } from '@/lib/trpc/server'

export default async function Page() {
  // Prefetch data on server
  await trpc.blog.list.prefetch({ page: 1 })

  return (
    <HydrateClient>
      <MyClientComponent />
    </HydrateClient>
  )
}
```

### Server Components (Direct Call)

```typescript
import { serverClient } from '@/lib/trpc/server'

export default async function Page() {
  // Direct call, bypasses query cache
  const blogs = await (await serverClient()).blog.list({ page: 1 })

  return <div>{/* render blogs */}</div>
}
```

## Benefits

1. **Type Safety** - Full end-to-end TypeScript types
2. **Server-Side Prefetching** - Render as you fetch pattern
3. **Automatic Hydration** - Server data seamlessly transfers to client
4. **Cache Deduplication** - Single QueryClient per request on server
5. **Singleton Client** - Reused QueryClient in browser for optimal performance
6. **No Loading States** - Data available immediately on initial render

## Technical Details

### Context Creation for Server Components

Since Server Components don't have a traditional fetch request, we create a mock context using Next.js `headers()`:

```typescript
const createServerContext = async () => {
  const headersList = await headers()
  return createContext({
    req: { headers: headersList } as any,
    resHeaders: new Headers(),
    info: {} as any
  })
}
```

This allows the same `createContext` function to work for both:
- API routes (via fetch adapter with real request)
- Server Components (via mock request with Next.js headers)

### Dehydration Configuration

```typescript
dehydrate: {
  serializeData: superjson.serialize,
  shouldDehydrateQuery: (query) =>
    defaultShouldDehydrateQuery(query) || query.state.status === 'pending'
}
```

This ensures:
- Complex types (Date, Map, Set) serialize correctly
- Pending queries are included (avoids refetch on client)

## Build Status

✅ TypeScript compilation passes
✅ All routes properly typed
✅ No deprecated API usage
✅ Production build successful

## References

- [tRPC Server Components Documentation](https://trpc.io/docs/client/tanstack-react-query/server-components)
- [@trpc/tanstack-react-query Package](https://www.npmjs.com/package/@trpc/tanstack-react-query)
