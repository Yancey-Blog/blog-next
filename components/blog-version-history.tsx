'use client'

import type { BlogVersion } from '@/lib/db/schema'
import { DiffResult } from '@/lib/services/diff.service'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
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
  const [versions, setVersions] = useState<BlogVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<BlogVersion | null>(
    null
  )
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([])
  const [diffResult, setDiffResult] = useState<{
    diff: DiffResult
    version1: { id: string; version: number; createdAt: Date }
    version2: { id: string; version: number; createdAt: Date }
  } | null>(null)
  const [open, setOpen] = useState(false)

  const loadVersions = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/blogs/${blogId}/versions`)
      if (!response.ok) {
        throw new Error('Failed to load version history')
      }
      const data = await response.json()
      setVersions(data)
    } catch (error) {
      console.error('Load versions error:', error)
      toast.error('Failed to load version history')
    } finally {
      setLoading(false)
    }
  }, [blogId])

  const handleRestore = async (versionId: string) => {
    if (
      !confirm(
        'Are you sure you want to restore to this version? Current content will be overwritten.'
      )
    ) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(
        `/api/blogs/${blogId}/versions/${versionId}/restore`,
        {
          method: 'POST'
        }
      )

      if (!response.ok) {
        throw new Error('Failed to restore version')
      }

      toast.success('Version restored successfully')
      setOpen(false)
      window.location.reload()
    } catch (error) {
      console.error('Restore version error:', error)
      toast.error('Failed to restore version')
    } finally {
      setLoading(false)
    }
  }

  const handleViewVersion = async (versionId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/blogs/${blogId}/versions/${versionId}`)
      if (!response.ok) {
        throw new Error('Failed to load version details')
      }
      const data = await response.json()
      setSelectedVersion(data)
    } catch (error) {
      console.error('Load version error:', error)
      toast.error('Failed to load version details')
    } finally {
      setLoading(false)
    }
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

    setLoading(true)
    try {
      const [version1Id, version2Id] = selectedForCompare
      const response = await fetch(
        `/api/blogs/${blogId}/versions/${version1Id}/diff?compareWith=${version2Id}`
      )

      if (!response.ok) {
        throw new Error('Failed to compare versions')
      }

      const data = await response.json()
      setDiffResult(data)
      setSelectedVersion(null) // Clear single version view
    } catch (error) {
      console.error('Compare versions error:', error)
      toast.error('Failed to compare versions')
    } finally {
      setLoading(false)
    }
  }

  const handleClearComparison = () => {
    setDiffResult(null)
    setSelectedForCompare([])
  }

  useEffect(() => {
    if (open) {
      loadVersions()
      setSelectedForCompare([])
      setDiffResult(null)
      setSelectedVersion(null)
    }
  }, [open, loadVersions])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" type="button">
          Version History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
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
                oldVersionDate={new Date(
                  diffResult.version1.createdAt
                ).toLocaleString()}
                newVersionDate={new Date(
                  diffResult.version2.createdAt
                ).toLocaleString()}
              />
            </div>
          )}

          {/* Version list */}
          {!diffResult && (
            <>
              {loading && versions.length === 0 && (
                <p className="text-muted-foreground text-center py-8">
                  Loading...
                </p>
              )}

              {!loading && versions.length === 0 && (
                <p className="text-muted-foreground text-center py-8">
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
                          <h4 className="font-semibold mb-2">Title</h4>
                          <p className="text-sm">{selectedVersion.title}</p>
                        </div>
                        {selectedVersion.summary && (
                          <div>
                            <h4 className="font-semibold mb-2">Summary</h4>
                            <p className="text-sm">{selectedVersion.summary}</p>
                          </div>
                        )}
                        <div>
                          <h4 className="font-semibold mb-2">
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
