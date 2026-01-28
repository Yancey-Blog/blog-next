'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from './ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Button } from './ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from './ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from './ui/table'

interface Session {
  id: string
  token: string
  expiresAt: string
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  userId: string
  userName: string
  userEmail: string
  userImage: string | null
}

export function SessionManagement() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  const loadSessions = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/sessions')
      if (!response.ok) {
        throw new Error('Failed to load sessions')
      }
      const data = await response.json()
      setSessions(data)
    } catch (error) {
      console.error('Load sessions error:', error)
      toast.error('Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }

  const deleteSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/admin/sessions/${sessionId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete session')
      }

      toast.success('Session deleted successfully (user logged out)')
      loadSessions()
    } catch (error) {
      console.error('Delete session error:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete session'
      )
    }
  }

  useEffect(() => {
    loadSessions()
  }, [])

  const formatUserAgent = (ua: string | null) => {
    if (!ua) return 'Unknown'

    // Simple parsing for common browsers
    if (ua.includes('Chrome')) return 'Chrome'
    if (ua.includes('Safari')) return 'Safari'
    if (ua.includes('Firefox')) return 'Firefox'
    if (ua.includes('Edge')) return 'Edge'
    return 'Unknown'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Loading sessions...
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Sessions</CardTitle>
        <CardDescription>
          Total: {sessions.length} active session
          {sessions.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={session.userImage || ''} />
                      <AvatarFallback>
                        {session.userName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{session.userName}</div>
                      <div className="text-sm text-muted-foreground">
                        {session.userEmail}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{formatUserAgent(session.userAgent)}</TableCell>
                <TableCell>
                  <code className="text-xs">
                    {session.ipAddress || 'Unknown'}
                  </code>
                </TableCell>
                <TableCell>
                  {new Date(session.createdAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </TableCell>
                <TableCell>
                  {new Date(session.expiresAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        Revoke
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Revoke Session</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to revoke this session? The user
                          will be logged out immediately.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteSession(session.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Revoke
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
