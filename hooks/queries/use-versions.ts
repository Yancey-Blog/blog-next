import { versionsApi } from '@/lib/api/versions'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { blogKeys } from './use-blogs'

// Query keys
export const versionKeys = {
  all: (blogId: string) => [...blogKeys.detail(blogId), 'versions'] as const,
  list: (blogId: string) => [...versionKeys.all(blogId), 'list'] as const,
  detail: (blogId: string, versionId: string) =>
    [...versionKeys.all(blogId), 'detail', versionId] as const,
  diff: (blogId: string, versionId1: string, versionId2: string) =>
    [...versionKeys.all(blogId), 'diff', versionId1, versionId2] as const
}

// Get all versions for a blog
export function useVersions(blogId: string, enabled = true) {
  return useQuery({
    queryKey: versionKeys.list(blogId),
    queryFn: () => versionsApi.getVersions(blogId),
    enabled: enabled && !!blogId
  })
}

// Get a specific version
export function useVersion(blogId: string, versionId: string, enabled = true) {
  return useQuery({
    queryKey: versionKeys.detail(blogId, versionId),
    queryFn: () => versionsApi.getVersion(blogId, versionId),
    enabled: enabled && !!blogId && !!versionId
  })
}

// Get diff between two versions
export function useVersionDiff(
  blogId: string,
  versionId1: string,
  versionId2: string,
  enabled = true
) {
  return useQuery({
    queryKey: versionKeys.diff(blogId, versionId1, versionId2),
    queryFn: () => versionsApi.getDiff(blogId, versionId1, versionId2),
    enabled: enabled && !!blogId && !!versionId1 && !!versionId2
  })
}

// Restore a version
export function useRestoreVersion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      blogId,
      versionId
    }: {
      blogId: string
      versionId: string
    }) => versionsApi.restoreVersion(blogId, versionId),
    onSuccess: (_, { blogId }) => {
      queryClient.invalidateQueries({ queryKey: blogKeys.detail(blogId) })
      queryClient.invalidateQueries({ queryKey: versionKeys.list(blogId) })
    }
  })
}
