'use client'

import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

export interface SettingsSection {
  id: string
  title: string
}

/**
 * Sticky in-page nav for the Settings page: jumps to a section and highlights
 * the one currently in view.
 */
export function SettingsNav({ sections }: { sections: SettingsSection[] }) {
  const [active, setActive] = useState(sections[0]?.id)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      // A section counts as current while it crosses the upper third of the
      // viewport.
      { rootMargin: '0px 0px -66% 0px' }
    )
    for (const { id } of sections) {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [sections])

  return (
    <nav aria-label="Settings sections" className="sticky top-6">
      <ul className="space-y-0.5 text-sm">
        {sections.map(({ id, title }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              onClick={(event) => {
                event.preventDefault()
                setActive(id)
                document
                  .getElementById(id)
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                history.replaceState(null, '', `#${id}`)
              }}
              aria-current={active === id ? 'true' : undefined}
              className={cn(
                'text-muted-foreground hover:text-foreground hover:bg-muted block rounded-md px-3 py-1.5 transition-colors',
                active === id && 'bg-muted text-foreground font-medium'
              )}
            >
              {title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
