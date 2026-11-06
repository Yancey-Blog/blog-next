import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined')
}

// Supabase's session pooler reserves a backend connection for every serverless
// instance. Use its transaction endpoint on Vercel; keep local/direct/custom
// connections and all credentials/SSL parameters as configured.
let connectionString = process.env.DATABASE_URL
if (process.env.VERCEL === '1') {
  const url = new URL(connectionString)
  if (url.hostname.endsWith('.pooler.supabase.com') && url.port === '5432') {
    url.port = '6543'
    connectionString = url.toString()
  }
}

// Reuse the client in production too: Next's server and proxy bundles can load
// this module separately in the same runtime. Idle clients must not live for
// Postgres.js's default 30–60 minutes across repeated deployments.
const globalForDb = globalThis as unknown as {
  __dbClient?: ReturnType<typeof postgres>
}
const client =
  globalForDb.__dbClient ??
  postgres(connectionString, {
    max: 1,
    prepare: false,
    // Never pipeline independent queries through the transaction pooler.
    max_pipeline: 1,
    idle_timeout: 5,
    max_lifetime: 60
  })
globalForDb.__dbClient = client

export const db = drizzle({ client, schema })
