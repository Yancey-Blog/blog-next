'use client'

import { analytics } from '@/lib/analytics'
import { liteClient as algoliasearch } from 'algoliasearch/lite'
import { Search } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Configure,
  Highlight,
  Hits,
  InstantSearch,
  PoweredBy,
  SearchBox,
  Snippet,
  useInstantSearch,
  useSearchBox
} from 'react-instantsearch'

const searchClient = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_APP_ID!,
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY!
)

interface AlgoliaHit {
  objectID: string
  name?: string
  description?: string
  content?: string
  labels?: string[]
  [key: string]: unknown
}

function Hit({ hit }: { hit: AlgoliaHit }) {
  return (
    <a
      href={`/post/${hit.objectID}`}
      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
    >
      <Search className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-foreground">
          <Highlight attribute="name" hit={hit} />
        </div>
        {hit.description && (
          <div className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
            <Snippet attribute="description" hit={hit} />
          </div>
        )}
        {!hit.description && hit.content && (
          <div className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
            <Snippet attribute="content" hit={hit} />
          </div>
        )}
      </div>
      {hit.labels && hit.labels.length > 0 && (
        <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          {hit.labels[0]}
        </span>
      )}
    </a>
  )
}

function LoadingIndicator() {
  const { status } = useInstantSearch()
  if (status !== 'stalled') return null
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  const { results } = useInstantSearch()
  const { query } = useSearchBox()
  if (!query || !results || results.nbHits > 0) return null
  return (
    <div className="p-8 text-center text-muted-foreground">
      No results for{' '}
      <span className="font-medium text-foreground">&quot;{query}&quot;</span>
    </div>
  )
}

function ModalContent({ onClose }: { onClose: () => void }) {
  const { query } = useSearchBox()
  const { results } = useInstantSearch()
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus the input when modal opens
  useEffect(() => {
    const timer = setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>(
        '.ais-SearchBox-input'
      )
      input?.focus()
    }, 50)
    return () => clearTimeout(timer)
  }, [])

  // Track search analytics
  useEffect(() => {
    if (query && results) {
      analytics.trackSearch(query, results.nbHits)
    }
  }, [query, results])

  const hasResults = query && results && results.nbHits > 0

  return (
    <div className="flex flex-col">
      {/* Search input row */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
        <SearchBox
          placeholder="Search articles..."
          classNames={{
            root: 'flex-1',
            form: 'relative',
            input:
              'w-full bg-transparent text-base outline-none placeholder:text-muted-foreground',
            submit: 'hidden',
            reset: 'hidden',
            loadingIndicator: 'hidden'
          }}
        />
      </div>

      {/* Results */}
      <div className="max-h-[50vh] overflow-y-auto">
        <LoadingIndicator />
        <EmptyState />
        {hasResults && (
          <Hits
            hitComponent={Hit}
            classNames={{ list: 'divide-y', item: '' }}
          />
        )}
        {!query && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Start typing to search articles...
          </div>
        )}
      </div>

      {/* Footer — always visible */}
      <div className="border-t px-4 py-3">
        <PoweredBy
          classNames={{
            root: 'flex justify-end items-center gap-2 text-xs text-muted-foreground',
            logo: 'h-4 w-auto'
          }}
        />
      </div>
    </div>
  )
}

function SearchModal({
  open,
  onClose
}: {
  open: boolean
  onClose: () => void
}) {
  const pathname = usePathname()

  // Close on route change
  useEffect(() => {
    onClose()
  }, [pathname, onClose])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-xl border bg-background shadow-2xl">
        <ModalContent onClose={onClose} />
      </div>
    </div>
  )
}

export function AlgoliaSearch() {
  const [open, setOpen] = useState(false)
  const handleClose = useCallback(() => setOpen(false), [])

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <InstantSearch
      searchClient={searchClient}
      indexName={process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_INDEX_NAME!}
      future={{ preserveSharedStateOnUnmount: true }}
    >
      <Configure
        attributesToSnippet={['content:120', 'description:50']}
        snippetEllipsisText="..."
      />

      {/* Fake input trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden rounded border bg-background px-1.5 py-0.5 text-xs sm:inline">
          ⌘K
        </kbd>
      </button>

      <SearchModal open={open} onClose={handleClose} />
    </InstantSearch>
  )
}
