import { apiClient } from '@/lib/api-client'
import type { ThemeConfig } from '@/lib/themes'

export interface UpdateThemeData {
  theme: ThemeConfig
}

export const themeApi = {
  // Get current theme
  getTheme: () => apiClient.get<ThemeConfig>('/api/admin/theme'),

  // Update theme (admin only)
  updateTheme: (data: UpdateThemeData) =>
    apiClient.post<{ message: string; theme: ThemeConfig }>(
      '/api/admin/theme',
      data
    )
}
