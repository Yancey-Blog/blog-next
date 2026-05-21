import { createTRPCRouter } from '../init'
import { adminRouter } from './admin'
import { blogRouter } from './blog'
import { meijiRouter } from './meiji'
import { uploadRouter } from './upload'
import { versionRouter } from './version'

export const appRouter = createTRPCRouter({
  blog: blogRouter,
  version: versionRouter,
  upload: uploadRouter,
  admin: adminRouter,
  meiji: meijiRouter
})

// Export type router type signature
// This is used by the client to get type-safety
export type AppRouter = typeof appRouter
