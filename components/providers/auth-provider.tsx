'use client'

// Better Auth doesn't require a provider wrapper
// The auth client works directly via hooks and functions
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
