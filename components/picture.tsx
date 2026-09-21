import type { ComponentProps } from 'react'

import { buildSources } from '@/lib/images/derivatives'
import { cn } from '@/lib/utils'

export interface PictureProps extends Omit<
  ComponentProps<'img'>,
  'src' | 'alt' | 'srcSet' | 'loading' | 'decoding' | 'fetchPriority'
> {
  src: string
  alt: string
  /** How wide the image renders, in `sizes` syntax. Drives the srcset choice. */
  sizes?: string
  /** Above-the-fold image: eager load with high fetch priority. */
  priority?: boolean
  /** Absolutely fill the nearest positioned ancestor. */
  fill?: boolean
  /** Skip the AVIF/WebP sources; used as the fallback after a load error. */
  disableDerivatives?: boolean
}

/**
 * `<picture>` with AVIF and WebP width tiers for first-party images, falling
 * back to the untouched original. Anything else (external hosts, GIF, SVG)
 * renders as a plain `<img>`. No 'use client': usable from server components.
 */
export function Picture({
  src,
  alt,
  sizes = '100vw',
  priority = false,
  fill = false,
  disableDerivatives = false,
  className,
  width,
  height,
  ...rest
}: PictureProps) {
  const derived = buildSources(src)

  return (
    // display: contents keeps the <img> laid out as if it were a direct child.
    <picture className="contents">
      {derived && !disableDerivatives && (
        <>
          <source type="image/avif" srcSet={derived.avifSrcSet} sizes={sizes} />
          <source type="image/webp" srcSet={derived.webpSrcSet} sizes={sizes} />
        </>
      )}
      <img
        {...rest}
        src={src}
        alt={alt}
        width={fill ? undefined : (width ?? derived?.width)}
        height={fill ? undefined : (height ?? derived?.height)}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : undefined}
        className={
          cn(fill && 'absolute inset-0 h-full w-full', className) || undefined
        }
      />
    </picture>
  )
}
