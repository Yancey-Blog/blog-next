import { router } from '../trpc'
import { adminRouter } from './admin'
import { blogRouter } from './blog'
import { uploadRouter } from './upload'
import { versionRouter } from './version'

export const appRouter = router({
  blog: blogRouter,
  version: versionRouter,
  upload: uploadRouter,
  admin: adminRouter
})

// Export type router type signature
// This is used by the client to get type-safety
export type AppRouter = typeof appRouter
