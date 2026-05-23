/**
 * Minimal contract the coordinator needs from a video element. Keeping it this
 * narrow lets the pause-others logic be unit-tested without a real DOM.
 */
export interface PausableVideo {
  pause: () => void
}

/**
 * Make `next` the single active video: pause the previously-active one (unless
 * it's the same element) and return `next` as the new active video. This is the
 * core of "only one Meiji video plays at a time" — used by both the feed and
 * the zoom lightbox so playing/swiping to a video never leaves another audible.
 */
export function activateVideo<T extends PausableVideo>(
  previous: T | null,
  next: T
): T {
  if (previous && previous !== next) {
    previous.pause()
  }
  return next
}
