'use client'

import { useEffect } from 'react'

/**
 * Progressive enhancement for the images inside server-rendered post HTML
 * (see lib/images/transform-html.ts). Rendered as a sibling of the content
 * container rather than a wrapper, so the article HTML is not serialised a
 * second time into the RSC payload.
 *
 * - Fades each image in over its blurred LQIP once it has loaded.
 * - If an AVIF/WebP derivative fails, drops the <source> elements so the
 *   browser falls back to the original.
 *
 * Without JavaScript the images are simply visible.
 */
export function BlogContentImages({ containerId }: { containerId: string }) {
  useEffect(() => {
    const root = document.getElementById(containerId)
    if (!root) return

    const wrapperOf = (img: HTMLImageElement) =>
      img.closest<HTMLElement>('.img-blur')

    const markLoaded = (img: HTMLImageElement) => {
      const wrapper = wrapperOf(img)
      if (!wrapper) return
      wrapper.removeAttribute('data-pending')
      wrapper.setAttribute('data-loaded', '')
    }

    const fallBack = (img: HTMLImageElement) => {
      const picture = img.parentElement
      const sources =
        picture?.tagName === 'PICTURE'
          ? picture.querySelectorAll('source')
          : null

      if (sources && sources.length > 0) {
        sources.forEach((source) => source.remove())
        const original = img.getAttribute('src')
        if (original) img.src = original
        return
      }
      // The original failed too: reveal the alt text instead of a blank box.
      wrapperOf(img)?.removeAttribute('data-pending')
    }

    const onLoad = (event: Event) => {
      if (event.target instanceof HTMLImageElement) markLoaded(event.target)
    }
    const onError = (event: Event) => {
      if (event.target instanceof HTMLImageElement) fallBack(event.target)
    }

    // load and error do not bubble, so listen in the capture phase.
    root.addEventListener('load', onLoad, true)
    root.addEventListener('error', onError, true)

    // Catch up with whatever happened before hydration.
    root.querySelectorAll<HTMLImageElement>('.img-blur img').forEach((img) => {
      if (!img.complete) {
        wrapperOf(img)?.setAttribute('data-pending', '')
      } else if (img.naturalWidth > 0) {
        markLoaded(img)
      } else {
        fallBack(img)
      }
    })

    return () => {
      root.removeEventListener('load', onLoad, true)
      root.removeEventListener('error', onError, true)
    }
  }, [containerId])

  return null
}
