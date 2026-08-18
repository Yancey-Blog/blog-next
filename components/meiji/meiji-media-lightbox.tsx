'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { formatDistanceToNow } from 'date-fns'
import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from '@/components/ui/carousel'
import type { MeijiMedia } from '@/lib/db/schema'

import { MeijiVideo } from './meiji-video'

function Slide({ item }: { item: MeijiMedia }) {
  return (
    <figure className="flex h-full flex-col items-center justify-between">
      {/* Polaroid-style white frame around the media */}
      <div className="rounded-[26px] border-[5px] border-white bg-white p-1.5 shadow-[0_16px_36px_-16px_rgba(75,63,87,0.5)]">
        {item.type === 'video' ? (
          <MeijiVideo
            src={item.url}
            containerClassName="relative inline-flex"
            videoClassName="max-h-[60vh] w-auto max-w-full rounded-[20px]"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.url}
            alt={item.caption ?? 'Meiji'}
            className="max-h-[60vh] w-auto max-w-full rounded-[20px] object-contain"
          />
        )}
      </div>

      <figcaption className="mt-4 text-center">
        {item.milestone && (
          <span
            className="meiji-pill mb-2 inline-block border-2 border-white px-3 py-1 text-xs font-extrabold capitalize"
            style={{ background: 'var(--m-lavender)', color: 'var(--m-ink)' }}
          >
            ⭐ {item.milestone}
          </span>
        )}
        {item.caption && (
          <p
            className="meiji-display text-xl"
            style={{ color: 'var(--m-ink)' }}
          >
            {item.caption}
          </p>
        )}
        <p
          className="mt-1 text-sm font-bold"
          style={{ color: 'var(--m-ink-soft)' }}
        >
          🐾 {formatDistanceToNow(new Date(item.takenAt), { addSuffix: true })}
        </p>
      </figcaption>
    </figure>
  )
}

export function MeijiMediaLightbox({
  media,
  startIndex,
  onClose
}: {
  media: MeijiMedia[]
  startIndex: number | null
  onClose: () => void
}) {
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const open = startIndex !== null

  // Track the active slide and pause every lightbox video on slide change, so
  // swiping away from a playing video stops its audio.
  useEffect(() => {
    if (!api) return
    const onSelect = () => {
      setCurrent(api.selectedScrollSnap())
      containerRef.current?.querySelectorAll('video').forEach((v) => v.pause())
    }
    onSelect()
    api.on('select', onSelect)
    api.on('reInit', onSelect)
    return () => {
      api.off('select', onSelect)
      api.off('reInit', onSelect)
    }
  }, [api])

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-[rgba(75,63,87,0.55)] backdrop-blur-sm" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="meiji-portal data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-3 fixed top-1/2 left-1/2 z-50 w-[92vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 duration-200 outline-none"
        >
          <DialogPrimitive.Title className="sr-only">
            Meiji media viewer
          </DialogPrimitive.Title>

          <div
            className="relative rounded-[40px] border-[6px] border-white p-6 shadow-[0_30px_70px_-20px_rgba(75,63,87,0.65)] sm:p-8"
            style={{
              backgroundImage:
                'linear-gradient(160deg, var(--m-cream), var(--m-cream-2))'
            }}
          >
            {/* Decorative paw stickers */}
            <span
              aria-hidden
              className="pointer-events-none absolute -top-5 -left-3 rotate-[-18deg] text-3xl drop-shadow-sm"
            >
              🐾
            </span>
            <span
              aria-hidden
              className="pointer-events-none absolute -right-3 -bottom-5 rotate-12 text-3xl drop-shadow-sm"
            >
              🐾
            </span>

            <DialogPrimitive.Close
              aria-label="Close"
              className="meiji-pill absolute top-4 right-4 z-20 grid h-9 w-9 place-items-center border-2 border-white shadow-md transition-transform hover:scale-110 hover:rotate-12"
              style={{ background: 'var(--m-peach)', color: 'var(--m-ink)' }}
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>

            {open && (
              <div ref={containerRef} className="px-6">
                <Carousel
                  key={startIndex}
                  opts={{ startIndex: startIndex ?? 0, loop: media.length > 1 }}
                  setApi={setApi}
                >
                  <CarouselContent>
                    {media.map((item) => (
                      <CarouselItem key={item.id}>
                        <Slide item={item} />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {media.length > 1 && (
                    <>
                      <CarouselPrevious
                        className="left-0 size-10 border-2 border-white text-[color:var(--m-ink)] shadow-md hover:text-white"
                        style={{ background: 'var(--m-lavender)' }}
                      />
                      <CarouselNext
                        className="right-0 size-10 border-2 border-white text-[color:var(--m-ink)] shadow-md hover:text-white"
                        style={{ background: 'var(--m-lavender)' }}
                      />
                    </>
                  )}
                </Carousel>

                {media.length > 1 && (
                  <div className="mt-4 flex items-center justify-center">
                    <span
                      className="meiji-pill border-2 border-white px-3 py-1 text-xs font-extrabold"
                      style={{
                        background: 'var(--m-white)',
                        color: 'var(--m-ink-soft)'
                      }}
                    >
                      {current + 1} / {media.length}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
