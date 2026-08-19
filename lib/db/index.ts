import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined')
}

// Reuse the client across HMR reloads in dev — otherwise every Fast Refresh
// opens a new pooled client and leaks connections until the pooler's limit
// (e.g. Supabase session-mode pool_size) is exhausted.
const globalForDb = globalThis as unknown as {
  __dbClient?: ReturnType<typeof postgres>
}
const client =
  globalForDb.__dbClient ?? postgres(process.env.DATABASE_URL, { max: 1 })
if (process.env.NODE_ENV !== 'production') globalForDb.__dbClient = client

export const db = drizzle({ client, schema })
