'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface UseAutosaveOptions<T> {
  data: T
  onSave: (data: T) => Promise<void>
  enabled?: boolean
  debounceMs?: number
  intervalMs?: number
}

interface UseAutosaveReturn {
  status: AutosaveStatus
  lastSaved: Date | null
  error: Error | null
  manualSave: () => Promise<void>
}

export function useAutosave<T>({
  data,
  onSave,
  enabled = true,
  debounceMs = 3000,
  intervalMs = 45000
}: UseAutosaveOptions<T>): UseAutosaveReturn {
  const [status, setStatus] = useState<AutosaveStatus>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const isSavingRef = useRef(false)
  const lastDataRef = useRef<string>('')
  const isInitializedRef = useRef(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const intervalTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Serialize data for comparison
  const serializeData = useCallback((d: T): string => {
    try {
      return JSON.stringify(d)
    } catch {
      return ''
    }
  }, [])

  // Check if data has changed
  const hasChanged = useCallback(
    (currentData: T): boolean => {
      const serialized = serializeData(currentData)
      const changed = serialized !== lastDataRef.current
      return changed && serialized !== ''
    },
    [serializeData]
  )

  // Save function with concurrent save prevention
  const save = useCallback(
    async (currentData: T) => {
      // Prevent concurrent saves
      if (isSavingRef.current || !enabled) {
        return
      }

      // Check if data has changed
      if (!hasChanged(currentData)) {
        return
      }

      isSavingRef.current = true
      setStatus('saving')
      setError(null)

      try {
        await onSave(currentData)
        lastDataRef.current = serializeData(currentData)
        setStatus('saved')
        setLastSaved(new Date())
      } catch (err) {
        setStatus('error')
        setError(err instanceof Error ? err : new Error('Save failed'))
      } finally {
        isSavingRef.current = false
      }
    },
    [enabled, hasChanged, onSave, serializeData]
  )

  // Manual save function exposed to caller
  const manualSave = useCallback(async () => {
    await save(data)
  }, [data, save])

  // Initialize lastDataRef with initial data to prevent immediate save on mount
  useEffect(() => {
    if (!isInitializedRef.current) {
      lastDataRef.current = serializeData(data)
      isInitializedRef.current = true
    }
  }, [data, serializeData])

  // Debounced save on data changes
  useEffect(() => {
    if (!enabled || !isInitializedRef.current) return

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      save(data)
    }, debounceMs)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [data, enabled, debounceMs, save])

  // Periodic save interval
  useEffect(() => {
    if (!enabled || !isInitializedRef.current) return

    intervalTimerRef.current = setInterval(() => {
      save(data)
    }, intervalMs)

    return () => {
      if (intervalTimerRef.current) {
        clearInterval(intervalTimerRef.current)
      }
    }
  }, [data, enabled, intervalMs, save])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (intervalTimerRef.current) {
        clearInterval(intervalTimerRef.current)
      }
    }
  }, [])

  return {
    status,
    lastSaved,
    error,
    manualSave
  }
}
