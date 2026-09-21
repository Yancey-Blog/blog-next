'use client'

import { useEffect, useRef } from 'react'

import { LazyLoadImage } from '@/components/lazy-load-image'

interface ParallaxHeroProps {
  imageUrl: string
  children: React.ReactNode
}

export function ParallaxHero({ imageUrl, children }: ParallaxHeroProps) {
  const bgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = bgRef.current
    if (!el) return

    const handleScroll = () => {
      const scrollY = window.scrollY
      el.style.transform = `translateY(${scrollY * 0.4}px)`
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <div className="absolute inset-0 -z-10">
        {/* An <img> instead of a CSS background so the hero gets AVIF/WebP
            tiers and the blur-up placeholder. It is the LCP element. */}
        <div
          ref={bgRef}
          className="absolute inset-0 -top-[20%] h-[120%] w-full will-change-transform"
        >
          <LazyLoadImage src={imageUrl} alt="" priority sizes="100vw" />
        </div>
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {children}
    </section>
  )
}
