'use client'

import { liteClient as algoliasearch } from 'algoliasearch/lite'
import { Search } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
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

import { analytics } from '@/lib/analytics'

import { Kbd } from './ui/kbd'

const searchClient = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_APP_ID!,
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY!
)

// Must include __position and __queryID which react-instantsearch injects at runtime
interface AlgoliaHit {
  objectID: string
  __position: number
  __queryID?: string
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
      className="hover:bg-muted/50 flex items-start gap-3 px-4 py-3 transition-colors"
    >
      <Search className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-foreground truncate font-medium">
          <Highlight attribute="name" hit={hit} />
        </div>
        {hit.description && (
          <div className="text-muted-foreground mt-0.5 line-clamp-1 text-sm">
            <Snippet attribute="description" hit={hit} />
          </div>
        )}
        {!hit.description && hit.content && (
          <div className="text-muted-foreground mt-0.5 line-clamp-1 text-sm">
            <Snippet attribute="content" hit={hit} />
          </div>
        )}
      </div>
      {hit.labels && hit.labels.length > 0 && (
        <span className="bg-muted text-muted-foreground shrink-0 rounded-md px-1.5 py-0.5 text-xs">
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
          <div className="bg-muted h-5 w-3/4 animate-pulse rounded" />
          <div className="bg-muted h-4 w-full animate-pulse rounded" />
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
    <div className="text-muted-foreground p-8 text-center">
      No results for{' '}
      <span className="text-foreground font-medium">&quot;{query}&quot;</span>
    </div>
  )
}

function ModalContent() {
  const { query } = useSearchBox()
  const { results } = useInstantSearch()

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
        <Search className="text-muted-foreground h-5 w-5 shrink-0" />
        <SearchBox
          placeholder="Search articles..."
          autoFocus
          classNames={{
            root: 'flex-1',
            form: 'relative',
            input:
              'w-full bg-transparent text-base outline-none placeholder:text-muted-foreground',
            submit: 'hidden',
            reset: 'hidden',
            loadingIndicator: 'hidden'
          }}
          ignoreCompositionEvents
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
          <div className="text-muted-foreground p-8 text-center text-sm">
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
    <div className="fixed inset-0 z-50 flex h-svh items-start justify-center px-4 pt-[10vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="bg-background relative z-10 w-full max-w-xl overflow-hidden rounded-xl border shadow-2xl">
        <ModalContent />
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
        className="bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors select-none"
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search...</span>
        <Kbd>⌘K</Kbd>
      </button>

      <SearchModal open={open} onClose={handleClose} />
    </InstantSearch>
  )
}
