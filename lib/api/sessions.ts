import { apiClient } from '@/lib/api-client'
import type { Session } from '@/lib/db/schema'

export const sessionsApi = {
  // Get all active sessions (admin only)
  getSessions: () => apiClient.get<Session[]>('/api/admin/sessions'),

  // Revoke a specific session (admin only)
  revokeSession: (sessionId: string) =>
    apiClient.delete<{ message: string }>(`/api/admin/sessions/${sessionId}`)
}
