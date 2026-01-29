import { sessionsApi } from '@/lib/api/sessions'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Query keys
export const sessionKeys = {
  all: ['sessions'] as const,
  lists: () => [...sessionKeys.all, 'list'] as const
}

// Get all active sessions (admin only)
export function useSessions() {
  return useQuery({
    queryKey: sessionKeys.lists(),
    queryFn: () => sessionsApi.getSessions()
  })
}

// Revoke a session (admin only)
export function useRevokeSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sessionId: string) => sessionsApi.revokeSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() })
    }
  })
}
