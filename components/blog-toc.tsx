'use client'

import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'

interface TocItem {
  id: string // Unique ID for React key
  originalId: string // Original ID for scrolling
  text: string
  level: number
}

interface BlogTocProps {
  content: string
}

export function BlogToc({ content }: BlogTocProps) {
  const [toc, setToc] = useState<TocItem[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Parse HTML and extract headings
    const parser = new DOMParser()
    const doc = parser.parseFromString(content, 'text/html')
    const headings = doc.querySelectorAll('h2[id], h3[id]')

    const items: TocItem[] = Array.from(headings).map((heading, index) => {
      const originalId = heading.id || `heading-${index}`
      return {
        id: `toc-${index}-${originalId}`, // Unique key for React
        originalId: originalId, // Original ID for scrolling
        text: heading.textContent || '',
        level: parseInt(heading.tagName.substring(1))
      }
    })

    setToc(items)
  }, [content])

  useEffect(() => {
    // Intersection Observer to track active heading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Find the TOC item by originalId
            const tocItem = toc.find(
              (item) => item.originalId === entry.target.id
            )
            if (tocItem) {
              setActiveId(tocItem.id)
            }
          }
        })
      },
      {
        rootMargin: '-80px 0px -80% 0px'
      }
    )

    const headings = document.querySelectorAll('h2[id], h3[id]')
    headings.forEach((heading) => observer.observe(heading))

    return () => {
      headings.forEach((heading) => observer.unobserve(heading))
    }
  }, [toc])

  const handleClick = (originalId: string) => {
    const element = document.getElementById(originalId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setIsOpen(false)
    }
  }

  if (toc.length === 0) {
    return null
  }

  return (
    <>
      {/* Mobile TOC Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="xl:hidden fixed top-20 right-4 z-40 p-3 bg-card border border-border rounded-lg shadow-lg hover:bg-accent transition-colors"
        aria-label="Toggle Table of Contents"
      >
        <ChevronRight
          className={cn('w-5 h-5 transition-transform', isOpen && 'rotate-90')}
        />
      </button>

      {/* Mobile TOC Overlay */}
      {isOpen && (
        <div
          className="xl:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* TOC Content */}
      <aside
        className={cn(
          'fixed top-24 right-4 w-64 max-h-[calc(100vh-7rem)] overflow-y-auto z-40',
          'bg-card border border-border rounded-lg shadow-lg p-4',
          // Mobile: slide in from right, Hidden on tablet, visible on desktop
          'hidden xl:block transition-transform duration-300',
          isOpen && 'block xl:block',
          isOpen
            ? 'translate-x-0'
            : 'translate-x-[calc(100%+1rem)] xl:translate-x-0'
        )}
      >
        <h3 className="text-sm font-semibold mb-3 text-foreground uppercase tracking-wide">
          Table of Contents
        </h3>
        <nav>
          <ul className="space-y-2">
            {toc.map((item) => (
              <li
                key={item.id}
                className={cn(
                  'text-sm transition-colors cursor-pointer',
                  item.level === 3 && 'pl-4'
                )}
              >
                <button
                  onClick={() => handleClick(item.originalId)}
                  className={cn(
                    'text-left w-full hover:text-primary transition-colors',
                    activeId === item.id
                      ? 'text-primary font-medium'
                      : 'text-muted-foreground'
                  )}
                >
                  {item.text}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Scrollbar styling */}
      <style jsx>{`
        aside::-webkit-scrollbar {
          width: 4px;
        }
        aside::-webkit-scrollbar-track {
          background: transparent;
        }
        aside::-webkit-scrollbar-thumb {
          background: hsl(var(--border));
          border-radius: 2px;
        }
        aside::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--border) / 0.8);
        }
      `}</style>
    </>
  )
}
