import { describe, expect, it, vi } from 'vitest'

import {
  activateVideo,
  type PausableVideo
} from '@/lib/meiji/video-coordinator'

function makeVideo(): PausableVideo {
  return { pause: vi.fn() }
}

describe('activateVideo', () => {
  it('pauses the previously active video when a different one plays', () => {
    const prev = makeVideo()
    const next = makeVideo()

    const active = activateVideo(prev, next)

    expect(prev.pause).toHaveBeenCalledTimes(1)
    expect(next.pause).not.toHaveBeenCalled()
    expect(active).toBe(next)
  })

  it('does not pause when the same video is re-activated', () => {
    const video = makeVideo()

    const active = activateVideo(video, video)

    expect(video.pause).not.toHaveBeenCalled()
    expect(active).toBe(video)
  })

  it('pauses nothing when there is no previously active video', () => {
    const next = makeVideo()

    const active = activateVideo(null, next)

    expect(next.pause).not.toHaveBeenCalled()
    expect(active).toBe(next)
  })
})
