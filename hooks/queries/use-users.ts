import { usersApi, type UpdateUserRoleData } from '@/lib/api/users'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Query keys
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const
}

// Get all users (admin only)
export function useUsers() {
  return useQuery({
    queryKey: userKeys.lists(),
    queryFn: () => usersApi.getUsers()
  })
}

// Update user role (admin only)
export function useUpdateUserRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      userId,
      data
    }: {
      userId: string
      data: UpdateUserRoleData
    }) => usersApi.updateUserRole(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    }
  })
}

// Delete user (admin only)
export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => usersApi.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    }
  })
}
