'use client'

import { cn } from '@/lib/utils'
import { ImageOffIcon } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

interface LazyLoadImageProps {
  src: string
  alt: string
  className?: string
  skeletonClassName?: string
  width?: number
  height?: number
  fill?: boolean
  priority?: boolean
}

export function LazyLoadImage({
  src,
  alt,
  className,
  skeletonClassName,
  width,
  height,
  fill = false,
  priority = false
}: LazyLoadImageProps) {
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

      {/* Next.js optimized image */}
      {!hasError && (
        <Image
          src={src}
          alt={alt}
          width={fill ? undefined : width || 800}
          height={fill ? undefined : height || 600}
          fill={fill}
          loading={priority ? undefined : 'lazy'}
          priority={priority}
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            setHasError(true)
            setIsLoaded(true)
          }}
          className={cn(
            'object-cover transition-opacity duration-500',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          unoptimized={
            src.startsWith('http') && !src.includes('edge.yancey.app')
          }
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
