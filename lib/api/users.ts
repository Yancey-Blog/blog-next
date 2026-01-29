import { apiClient } from '@/lib/api-client'
import type { User } from '@/lib/db/schema'

export interface UpdateUserRoleData {
  role: 'user' | 'admin'
}

export const usersApi = {
  // Get all users (admin only)
  getUsers: () => apiClient.get<User[]>('/api/admin/users'),

  // Update user role (admin only)
  updateUserRole: (userId: string, data: UpdateUserRoleData) =>
    apiClient.patch<User>(`/api/admin/users/${userId}`, data),

  // Delete user (admin only)
  deleteUser: (userId: string) =>
    apiClient.delete<{ message: string }>(`/api/admin/users/${userId}`)
}
