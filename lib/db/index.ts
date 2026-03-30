import * as schema from './schema'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined')
}

const client = postgres(process.env.DATABASE_URL, { max: 1 })
export const db = drizzle({ client, schema })
