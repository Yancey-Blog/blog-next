'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

import { HikkiDetailSkeleton } from '@/components/hikki-loading'
import {
  HIKKI_READER_ORIGIN as READER_ORIGIN,
  readerMessage
} from '@/lib/hikki/preview-channel'
import { useTRPC } from '@/lib/trpc/client'

export function HikkiPagePreview({
  id,
  revision,
  published,
  snapshot,
  onReady
}: {
  id: string
  revision: string
  published: boolean
  snapshot: string
  onReady: (snapshot: string | null) => void
}) {
  const trpc = useTRPC()
  const frame = useRef<HTMLIFrameElement>(null)
  const [available, setAvailable] = useState(0)
  const [failed, setFailed] = useState(false)
  const [rendered, setRendered] = useState(false)
  const [nonce] = useState(() => crypto.randomUUID())
  const preview = useQuery(
    trpc.hikki.preview.queryOptions(
      { id, revision, published },
      { retry: false, gcTime: 0 }
    )
  )

  useEffect(() => {
    onReady(null)
    const receive = (event: MessageEvent) => {
      const message = readerMessage(event, frame.current?.contentWindow, nonce)
      if (message === 'ready') setAvailable((value) => value + 1)
      if (message === 'rendered') {
        clearTimeout(timeout)
        setRendered(true)
        setFailed(false)
        onReady(snapshot)
      } else if (message === 'failed') {
        setFailed(true)
        onReady(null)
      }
    }
    window.addEventListener('message', receive)
    const timeout = setTimeout(() => setFailed(true), 20_000)
    return () => {
      clearTimeout(timeout)
      window.removeEventListener('message', receive)
    }
  }, [nonce, snapshot, onReady])

  useEffect(() => {
    if (!available || !preview.data) return
    frame.current?.contentWindow?.postMessage(
      { type: 'hikki.preview.document', nonce, ...preview.data },
      READER_ORIGIN
    )
  }, [available, nonce, preview.data])

  return (
    <div className="space-y-2">
      {preview.error && (
        <p role="alert" className="text-destructive text-sm">
          {preview.error.message}
        </p>
      )}
      {!rendered && !preview.error && failed && (
        <p role="alert" className="text-muted-foreground text-sm">
          The preview could not be loaded. Reload this page before reviewing.
        </p>
      )}
      <div className="relative h-screen max-h-[75vh] min-h-96">
        {!rendered && !preview.error && !failed && (
          <div className="bg-background absolute inset-0 rounded-lg border p-6">
            <HikkiDetailSkeleton label="Loading the website reader" />
          </div>
        )}
        <iframe
          ref={frame}
          src={`${READER_ORIGIN}/review-preview`}
          title="Hikki page snapshot"
          className={`h-full w-full rounded-lg border ${rendered ? '' : 'invisible'}`}
          aria-hidden={!rendered}
          tabIndex={rendered ? 0 : -1}
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="origin"
          onLoad={() => setAvailable((value) => value + 1)}
        />
      </div>
    </div>
  )
}
