'use client'

import { cn } from '@/lib/utils'
import { ImageOffIcon } from 'lucide-react'
import { useState } from 'react'

export function LazyLoadImage({
  src,
  alt,
  className,
  skeletonClassName
}: {
  src: string
  alt: string
  className?: string
  skeletonClassName?: string
}) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Skeleton loader */}
      {!isLoaded && !hasError && (
        <div
          className={cn(
            'absolute inset-0 animate-pulse bg-muted',
            skeletonClassName
          )}
        />
      )}

      {/* Actual image */}
      {!hasError && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            setHasError(true)
            setIsLoaded(true)
          }}
          className={cn(
            'h-full w-full object-cover transition-opacity duration-500',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
        />
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <ImageOffIcon className="h-12 w-12 text-muted-foreground" />
        </div>
      )}
    </div>
  )
}
