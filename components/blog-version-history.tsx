'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import type { BlogVersion } from '@/lib/db/schema'
import { DiffResult } from '@/lib/services/diff.service'
import { useTRPC } from '@/lib/trpc/client'

import { BlogVersionDiff } from './blog-version-diff'
import { Button } from './ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from './ui/card'
import { Checkbox } from './ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from './ui/dialog'

interface BlogVersionHistoryProps {
  blogId: string
}

export function BlogVersionHistory({ blogId }: BlogVersionHistoryProps) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<BlogVersion | null>(
    null
  )
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([])
  const [diffResult, setDiffResult] = useState<{
    diff: DiffResult
    oldVersionDate: string
    newVersionDate: string
  } | null>(null)
  const [comparing, setComparing] = useState(false)

  const { data: versions = [], isLoading } = useQuery({
    ...trpc.version.list.queryOptions({ blogId }),
    enabled: open
  })

  const restoreMutation = useMutation(trpc.version.restore.mutationOptions())

  const loading = isLoading || restoreMutation.isPending || comparing

  const handleRestore = (versionId: string) => {
    if (
      !confirm(
        'Are you sure you want to restore to this version? Current content will be overwritten.'
      )
    ) {
      return
    }

    restoreMutation.mutate(
      { blogId, versionId },
      {
        onSuccess: () => {
          toast.success('Version restored successfully')
          setOpen(false)
          queryClient.invalidateQueries({
            queryKey: trpc.version.list.queryOptions({ blogId }).queryKey
          })
          router.refresh()
        },
        onError: (error) => {
          console.error('Restore version error:', error)
          toast.error('Failed to restore version')
        }
      }
    )
  }

  const handleViewVersion = (versionId: string) => {
    setSelectedVersion(versions.find((v) => v.id === versionId) ?? null)
  }

  const handleCompareSelect = (versionId: string, checked: boolean) => {
    setSelectedForCompare((prev) => {
      if (checked) {
        // Only allow 2 selections
        if (prev.length >= 2) {
          toast.error('You can only compare 2 versions at a time')
          return prev
        }
        return [...prev, versionId]
      } else {
        return prev.filter((id) => id !== versionId)
      }
    })
  }

  const handleCompare = async () => {
    if (selectedForCompare.length !== 2) {
      toast.error('Please select exactly 2 versions to compare')
      return
    }

    const [versionId1, versionId2] = selectedForCompare
    const version1 = versions.find((v) => v.id === versionId1)
    const version2 = versions.find((v) => v.id === versionId2)

    if (!version1 || !version2) {
      toast.error('Failed to compare versions')
      return
    }

    setComparing(true)
    try {
      const diff = await queryClient.fetchQuery(
        trpc.version.diff.queryOptions({ blogId, versionId1, versionId2 })
      )

      setDiffResult({
        diff,
        oldVersionDate: new Date(version1.createdAt).toLocaleString(),
        newVersionDate: new Date(version2.createdAt).toLocaleString()
      })
      setSelectedVersion(null) // Clear single version view
    } catch (error) {
      console.error('Compare versions error:', error)
      toast.error('Failed to compare versions')
    } finally {
      setComparing(false)
    }
  }

  const handleClearComparison = () => {
    setDiffResult(null)
    setSelectedForCompare([])
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setSelectedForCompare([])
      setDiffResult(null)
      setSelectedVersion(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline" type="button">
            Version History
          </Button>
        }
      />
      <DialogContent className="max-h-[80vh] max-w-6xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
          <DialogDescription>
            View, compare, and restore previous blog versions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Compare actions */}
          {versions.length > 1 && !diffResult && (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCompare}
                disabled={selectedForCompare.length !== 2 || loading}
              >
                Compare Selected ({selectedForCompare.length}/2)
              </Button>
              {selectedForCompare.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedForCompare([])}
                  disabled={loading}
                >
                  Clear Selection
                </Button>
              )}
            </div>
          )}

          {/* Diff result view */}
          {diffResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Version Comparison</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearComparison}
                >
                  Back to List
                </Button>
              </div>
              <BlogVersionDiff
                diff={diffResult.diff}
                oldVersionDate={diffResult.oldVersionDate}
                newVersionDate={diffResult.newVersionDate}
              />
            </div>
          )}

          {/* Version list */}
          {!diffResult && (
            <>
              {loading && versions.length === 0 && (
                <p className="text-muted-foreground py-8 text-center">
                  Loading...
                </p>
              )}

              {!loading && versions.length === 0 && (
                <p className="text-muted-foreground py-8 text-center">
                  No version history available. Versions are created when you
                  publish a blog.
                </p>
              )}

              {versions.map((version) => (
                <Card key={version.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {versions.length > 1 && (
                          <Checkbox
                            checked={selectedForCompare.includes(version.id)}
                            onCheckedChange={(checked) =>
                              handleCompareSelect(
                                version.id,
                                checked as boolean
                              )
                            }
                            disabled={
                              loading ||
                              (selectedForCompare.length >= 2 &&
                                !selectedForCompare.includes(version.id))
                            }
                          />
                        )}
                        <div>
                          <CardTitle className="text-base">
                            Version {version.version}
                          </CardTitle>
                          <CardDescription>
                            {new Date(version.createdAt).toLocaleString(
                              'en-US',
                              {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }
                            )}
                            {version.changeNote && ` - ${version.changeNote}`}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewVersion(version.id)}
                          disabled={loading}
                        >
                          View
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleRestore(version.id)}
                          disabled={loading}
                        >
                          Restore
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {selectedVersion?.id === version.id && (
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="mb-2 font-semibold">Title</h4>
                          <p className="text-sm">{selectedVersion.title}</p>
                        </div>
                        {selectedVersion.summary && (
                          <div>
                            <h4 className="mb-2 font-semibold">Summary</h4>
                            <p className="text-sm">{selectedVersion.summary}</p>
                          </div>
                        )}
                        <div>
                          <h4 className="mb-2 font-semibold">
                            Content Preview
                          </h4>
                          <div
                            className="prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{
                              __html:
                                selectedVersion.content.substring(0, 500) +
                                '...'
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
