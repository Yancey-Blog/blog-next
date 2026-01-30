import 'server-only'

import { cache } from 'react'
import { createQueryClient } from './query-client'

/**
 * Creates a QueryClient instance for server-side rendering
 * Uses React cache() to ensure we get the same instance per request
 */
export const makeQueryClient = cache(createQueryClient)
