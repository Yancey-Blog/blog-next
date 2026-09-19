'use client'

import { ImageOffIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Picture } from '@/components/picture'
import { buildSources } from '@/lib/images/derivatives'
import { cn } from '@/lib/utils'

interface LazyLoadImageProps {
  src: string
  alt: string
  /**
   * Applied to the layer that holds both the placeholder and the image, so
   * hover transforms move them together and never clobber the opacity fade.
   */
  className?: string
  skeletonClassName?: string
  /** Accepted for compatibility. The image always fills its wrapper. */
  width?: number
  /** Accepted for compatibility. The image always fills its wrapper. */
  height?: number
  /** Accepted for compatibility. The image always fills its wrapper. */
  fill?: boolean
  priority?: boolean
  /** How wide the image renders, in `sizes` syntax. */
  sizes?: string
}

/**
 * Cover-fit image that fills its (sized, positioned) parent.
 *
 * First-party images blur up: a 24px LQIP is shown blurred until the real
 * image has loaded, then the two cross-fade. Other images keep the pulsing
 * skeleton. If a derivative fails to load, the original is tried once before
 * the error state is shown.
 */
export function LazyLoadImage({
  src,
  alt,
  className,
  skeletonClassName,
  priority = false,
  sizes = '100vw'
}: LazyLoadImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [useOriginal, setUseOriginal] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const lqipUrl = buildSources(src)?.lqipUrl

  const handleError = () => {
    if (lqipUrl && !useOriginal) {
      setUseOriginal(true)
      return
    }
    setHasError(true)
    setIsLoaded(true)
  }

  // Both outcomes can happen before hydration attaches onLoad/onError: a cached
  // image finishes instantly, and a missing derivative can 404 just as fast.
  useEffect(() => {
    const img = imgRef.current
    if (!img?.complete) return
    if (img.naturalWidth > 0) setIsLoaded(true)
    // Only on the first pass: once we are retrying with the original, the
    // listeners are attached and onError reports a second failure itself.
    else if (!useOriginal) handleError()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useOriginal])

  return (
    <div className="relative h-full w-full overflow-hidden">
      {!hasError && (
        <div className={cn('absolute inset-0', className)}>
          {/* Blurred LQIP for first-party images */}
          {lqipUrl && (
            <img
              src={lqipUrl}
              alt=""
              aria-hidden="true"
              loading={priority ? 'eager' : 'lazy'}
              className={cn(
                'absolute inset-0 h-full w-full scale-110 object-cover blur-xl transition-opacity duration-500 motion-reduce:transition-none',
                isLoaded ? 'opacity-0' : 'opacity-100'
              )}
            />
          )}

          {/* Skeleton for everything else */}
          {!lqipUrl && !isLoaded && (
            <div
              className={cn(
                'bg-muted absolute inset-0 animate-pulse',
                skeletonClassName
              )}
            />
          )}

          <Picture
            ref={imgRef}
            src={src}
            alt={alt}
            sizes={sizes}
            fill
            priority={priority}
            disableDerivatives={useOriginal}
            onLoad={() => setIsLoaded(true)}
            onError={handleError}
            className={cn(
              'object-cover transition-opacity duration-500 motion-reduce:transition-none',
              // Priority images are LCP candidates: paint them as soon as
              // bytes arrive instead of waiting for JavaScript to reveal them.
              priority || isLoaded ? 'opacity-100' : 'opacity-0'
            )}
          />
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="bg-muted absolute inset-0 flex items-center justify-center">
          <ImageOffIcon className="text-muted-foreground h-12 w-12" />
        </div>
      )}
    </div>
  )
}
