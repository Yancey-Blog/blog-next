import type { UpdateThemeData } from '@/lib/api/theme'
import { themeApi } from '@/lib/api/theme'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Query keys
export const themeKeys = {
  all: ['theme'] as const,
  current: () => [...themeKeys.all, 'current'] as const
}

// Get current theme
export function useTheme() {
  return useQuery({
    queryKey: themeKeys.current(),
    queryFn: () => themeApi.getTheme()
  })
}

// Update theme (admin only)
export function useUpdateTheme() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateThemeData) => themeApi.updateTheme(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: themeKeys.current() })
    }
  })
}
