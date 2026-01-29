'use client'

import { DiffChange, DiffResult } from '@/lib/services/diff.service'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

interface BlogVersionDiffProps {
  diff: DiffResult
  oldVersionDate: string
  newVersionDate: string
}

function DiffText({ changes }: { changes: DiffChange[] }) {
  if (!changes || changes.length === 0) {
    return <span className="text-muted-foreground italic">No content</span>
  }

  return (
    <div className="whitespace-pre-wrap break-words">
      {changes.map((change, index) => {
        if (change.added) {
          return (
            <span
              key={index}
              className="bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-300"
            >
              {change.value}
            </span>
          )
        }
        if (change.removed) {
          return (
            <span
              key={index}
              className="bg-red-100 text-red-900 line-through dark:bg-red-900/30 dark:text-red-300"
            >
              {change.value}
            </span>
          )
        }
        return <span key={index}>{change.value}</span>
      })}
    </div>
  )
}

function hasChanges(changes: DiffChange[]): boolean {
  return changes.some((c) => c.added || c.removed)
}

export function BlogVersionDiff({
  diff,
  oldVersionDate,
  newVersionDate
}: BlogVersionDiffProps) {
  const hasTitleChanges = hasChanges(diff.title)
  const hasSummaryChanges = hasChanges(diff.summary)
  const hasContentChanges = hasChanges(diff.content)
  const hasCoverImageChanges = diff.coverImage.changed

  const hasAnyChanges =
    hasTitleChanges ||
    hasSummaryChanges ||
    hasContentChanges ||
    hasCoverImageChanges

  if (!hasAnyChanges) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            No differences found between these versions.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm bg-red-100 dark:bg-red-900/30" />
          <span>Removed ({oldVersionDate})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm bg-green-100 dark:bg-green-900/30" />
          <span>Added ({newVersionDate})</span>
        </div>
      </div>

      {hasTitleChanges && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Title</CardTitle>
          </CardHeader>
          <CardContent>
            <DiffText changes={diff.title} />
          </CardContent>
        </Card>
      )}

      {hasSummaryChanges && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <DiffText changes={diff.summary} />
          </CardContent>
        </Card>
      )}

      {hasCoverImageChanges && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cover Image</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">
                  Old Version
                </p>
                {diff.coverImage.old ? (
                  <div className="relative aspect-video overflow-hidden rounded-lg border bg-muted">
                    <Image
                      src={diff.coverImage.old}
                      alt="Old cover image"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center rounded-lg border bg-muted">
                    <span className="text-sm text-muted-foreground">
                      No image
                    </span>
                  </div>
                )}
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">
                  New Version
                </p>
                {diff.coverImage.new ? (
                  <div className="relative aspect-video overflow-hidden rounded-lg border bg-muted">
                    <Image
                      src={diff.coverImage.new}
                      alt="New cover image"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center rounded-lg border bg-muted">
                    <span className="text-sm text-muted-foreground">
                      No image
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {hasContentChanges && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <DiffText changes={diff.content} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
