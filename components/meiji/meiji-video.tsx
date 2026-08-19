'use client'

import { Play } from 'lucide-react'
import { useRef, useState } from 'react'

import { useMeijiVideo } from './meiji-video-provider'

/**
 * A softened video player for the kawaii Meiji theme. At rest it hides the raw
 * native controls behind a cute play sticker; native controls only appear while
 * playing (so scrubbing/pausing still work). Playback registers with the shared
 * coordinator so only one Meiji video plays at a time.
 */
export function MeijiVideo({
  src,
  containerClassName,
  videoClassName
}: {
  src: string
  containerClassName?: string
  videoClassName?: string
}) {
  const { activate } = useMeijiVideo()
  const ref = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)

  return (
    <div className={containerClassName}>
      <video
        ref={ref}
        src={src}
        playsInline
        preload="metadata"
        controls={playing}
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        onPlay={(e) => {
          setPlaying(true)
          activate(e.currentTarget)
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        className={videoClassName}
      />

      {!playing && (
        <button
          type="button"
          aria-label="Play video"
          onClick={() => ref.current?.play()}
          className="group/play absolute inset-0 z-10 flex items-center justify-center"
        >
          <span
            className="grid h-16 w-16 place-items-center rounded-full border-[3px] border-white text-white shadow-[0_12px_28px_-10px_rgba(75,63,87,0.7)] transition-transform duration-200 group-hover/play:scale-110"
            style={{ background: 'var(--m-gold)' }}
          >
            <Play className="h-7 w-7 translate-x-0.5 fill-current" />
          </span>
        </button>
      )}
    </div>
  )
}
