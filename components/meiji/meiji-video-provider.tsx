'use client'

import { createContext, useCallback, useContext, useRef } from 'react'

import { activateVideo } from '@/lib/meiji/video-coordinator'

type MeijiVideoContextValue = {
  /** Call from a video's `onPlay`; pauses whatever was playing before. */
  activate: (el: HTMLVideoElement) => void
  /** Pause the currently-active video (e.g. when opening the zoom lightbox). */
  pauseActive: () => void
}

const MeijiVideoContext = createContext<MeijiVideoContextValue | null>(null)

/**
 * Coordinates Meiji video playback so only one plays at a time. Wraps the feed
 * and its zoom lightbox; both forward each `<video>`'s `onPlay` to `activate`.
 */
export function MeijiVideoProvider({
  children
}: {
  children: React.ReactNode
}) {
  const activeRef = useRef<HTMLVideoElement | null>(null)

  const activate = useCallback((el: HTMLVideoElement) => {
    activeRef.current = activateVideo(activeRef.current, el)
  }, [])

  const pauseActive = useCallback(() => {
    activeRef.current?.pause()
  }, [])

  return (
    <MeijiVideoContext.Provider value={{ activate, pauseActive }}>
      {children}
    </MeijiVideoContext.Provider>
  )
}

export function useMeijiVideo(): MeijiVideoContextValue {
  const ctx = useContext(MeijiVideoContext)
  if (!ctx) {
    throw new Error('useMeijiVideo must be used within a MeijiVideoProvider')
  }
  return ctx
}
