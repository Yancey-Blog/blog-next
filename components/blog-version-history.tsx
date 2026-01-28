'use client'

import type { BlogVersion } from '@/lib/db/schema'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from './ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from './ui/card'
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
  const [open, setOpen] = useState(false)

  const loadVersions = async () => {
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
  }

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

  useEffect(() => {
    if (open) {
      loadVersions()
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" type="button">
          Version History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
          <DialogDescription>
            View and restore previous blog versions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading && versions.length === 0 && (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          )}

          {!loading && versions.length === 0 && (
            <p className="text-muted-foreground text-center py-8">
              No version history available
            </p>
          )}

          {versions.map((version) => (
            <Card key={version.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      Version {version.version}
                    </CardTitle>
                    <CardDescription>
                      {new Date(version.createdAt).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                      {version.changeNote && ` - ${version.changeNote}`}
                    </CardDescription>
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
                      <h4 className="font-semibold mb-2">Content Preview</h4>
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{
                          __html:
                            selectedVersion.content.substring(0, 500) + '...'
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
