'use client'

import { AutosaveStatus } from '@/hooks/use-autosave'
import { IconAlertCircle, IconCheck, IconLoader2 } from '@tabler/icons-react'

interface AutosaveIndicatorProps {
  status: AutosaveStatus
  lastSaved: Date | null
  error: Error | null
}

export function AutosaveIndicator({
  status,
  lastSaved,
  error
}: AutosaveIndicatorProps) {
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (status === 'idle') {
    return null
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border bg-background px-4 py-3 shadow-lg transition-all duration-300 animate-in slide-in-from-bottom-5"
      role="status"
      aria-live="polite"
    >
      {status === 'saving' && (
        <>
          <IconLoader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            Saving...
          </span>
        </>
      )}

      {status === 'saved' && lastSaved && (
        <>
          <IconCheck className="h-4 w-4 text-green-600 dark:text-green-500" />
          <span className="text-sm font-medium text-foreground">
            Saved at {formatTime(lastSaved)}
          </span>
        </>
      )}

      {status === 'error' && (
        <>
          <IconAlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium text-destructive">
            {error?.message || 'Save failed'}
          </span>
        </>
      )}
    </div>
  )
}
