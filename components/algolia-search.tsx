'use client'

import { analytics } from '@/lib/analytics'
import { liteClient as algoliasearch } from 'algoliasearch/lite'
import { Search, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
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

function Hit({ hit }: { hit: any }) {
  return (
    <a
      href={`/post/${hit.objectID}`}
      className="block p-4 transition-colors hover:bg-muted/50"
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className="font-semibold text-primary">
          <Highlight attribute="title" hit={hit} />
        </div>
      </div>
      {hit.summary && (
        <div className="mb-2 text-sm text-muted-foreground">
          <Highlight attribute="summary" hit={hit} />
        </div>
      )}
      {hit.content && (
        <div className="line-clamp-2 text-sm text-muted-foreground">
          <Snippet attribute="content" hit={hit} />
        </div>
      )}
      {hit.tags && hit.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {hit.tags.slice(0, 3).map((tag: string) => (
            <span
              key={tag}
              className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </a>
  )
}

function LoadingIndicator() {
  const { status } = useInstantSearch()

  if (status !== 'stalled') return null

  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  const { results } = useInstantSearch()

  if (!results || results.nbHits > 0) return null

  return (
    <div className="p-8 text-center text-muted-foreground">
      <p>No results found. Try a different search term.</p>
    </div>
  )
}

function SearchContent({
  showDrawer,
  onClose
}: {
  showDrawer: boolean
  onClose: () => void
}) {
  const { refine } = useSearchBox()

  const handleReset = () => {
    refine('')
    onClose()
  }

  return (
    <>
      {/* Search Box */}
      <div className="relative">
        <SearchBox
          placeholder="Search articles..."
          classNames={{
            root: 'relative',
            form: 'relative',
            input:
              'w-full rounded-full border bg-background/50 py-2 pl-10 pr-10 text-sm transition-all focus:w-64 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:w-48',
            submit: 'absolute left-3 top-1/2 -translate-y-1/2',
            submitIcon: 'hidden',
            reset: 'absolute right-3 top-1/2 -translate-y-1/2',
            resetIcon: 'hidden',
            loadingIndicator: 'absolute right-3 top-1/2 -translate-y-1/2'
          }}
          submitIconComponent={() => (
            <Search className="h-4 w-4 text-muted-foreground" />
          )}
          resetIconComponent={() => (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center justify-center"
              aria-label="Clear search"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        />
      </div>

      {/* Results Drawer */}
      <div
        className={`fixed right-0 top-0 z-50 h-screen w-full overflow-y-auto border-l bg-background shadow-2xl transition-transform duration-300 md:w-[450px] ${
          showDrawer ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="sticky top-0 z-10 border-b bg-background/95 p-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Search Results</h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 transition-colors hover:bg-muted"
              aria-label="Close search"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Results */}
        <LoadingIndicator />
        <EmptyState />
        <Hits hitComponent={Hit} />

        {/* Powered by Algolia */}
        <div className="border-t p-4">
          <PoweredBy
            classNames={{
              root: 'flex justify-center items-center gap-2 text-sm text-muted-foreground',
              logo: 'h-5 w-auto'
            }}
          />
        </div>
      </div>
    </>
  )
}

function SearchWrapper() {
  const [showDrawer, setShowDrawer] = useState(false)
  const pathname = usePathname()
  const { query } = useSearchBox()
  const { results } = useInstantSearch()

  // Show drawer when query has content
  useEffect(() => {
    setShowDrawer(query.trim() !== '')
  }, [query])

  // Track search events
  useEffect(() => {
    if (query && results) {
      analytics.trackSearch(query, results.nbHits)
    }
  }, [query, results])

  const handleClose = () => {
    setShowDrawer(false)
  }

  // Close on route change
  useEffect(() => {
    handleClose()
  }, [pathname])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    if (showDrawer) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [showDrawer])

  return (
    <>
      {/* Overlay */}
      {showDrawer && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
        />
      )}

      <SearchContent showDrawer={showDrawer} onClose={handleClose} />
    </>
  )
}

export function AlgoliaSearch() {
  return (
    <InstantSearch
      searchClient={searchClient}
      indexName={process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_INDEX_NAME!}
      future={{
        preserveSharedStateOnUnmount: true
      }}
    >
      <Configure
        attributesToSnippet={['content:120', 'summary:50']}
        snippetEllipsisText="..."
      />
      <SearchWrapper />
    </InstantSearch>
  )
}
