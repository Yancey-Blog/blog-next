import { apiClient } from '@/lib/api-client'
import type { BlogVersion } from '@/lib/db/schema'

export interface DiffResult {
  title: Array<{ added?: boolean; removed?: boolean; value: string }>
  summary: Array<{ added?: boolean; removed?: boolean; value: string }>
  content: Array<{ added?: boolean; removed?: boolean; value: string }>
  coverImage: {
    old: string | null
    new: string | null
    changed: boolean
  }
}

export const versionsApi = {
  // Get all versions for a blog
  getVersions: (blogId: string) =>
    apiClient.get<BlogVersion[]>(`/api/blogs/${blogId}/versions`),

  // Get a specific version
  getVersion: (blogId: string, versionId: string) =>
    apiClient.get<BlogVersion>(`/api/blogs/${blogId}/versions/${versionId}`),

  // Get diff between two versions
  getDiff: (blogId: string, versionId1: string, versionId2: string) =>
    apiClient.get<DiffResult>(
      `/api/blogs/${blogId}/versions/${versionId1}/diff`,
      { params: { compareWith: versionId2 } }
    ),

  // Restore a specific version
  restoreVersion: (blogId: string, versionId: string) =>
    apiClient.post<{ message: string }>(
      `/api/blogs/${blogId}/versions/${versionId}/restore`
    )
}
