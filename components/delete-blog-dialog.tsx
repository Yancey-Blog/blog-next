'use client'

import { useTRPC } from '@/lib/trpc/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
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
import { Button } from './ui/button'

interface DeleteBlogDialogProps {
  blogId: string
  blogTitle: string
}

export function DeleteBlogDialog({ blogId, blogTitle }: DeleteBlogDialogProps) {
  const router = useRouter()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const deleteMutation = useMutation({
    ...trpc.blog.delete.mutationOptions(),
    onSuccess: () => {
      toast.success('Blog deleted successfully')
      setOpen(false)
      // Invalidate and refetch blog list
      queryClient.invalidateQueries({
        queryKey: trpc.blog.list.queryOptions({ page: 1 }).queryKey
      })
      router.refresh()
    },
    onError: (error) => {
      console.error('Delete error:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete blog'
      )
    }
  })

  const handleDelete = () => {
    deleteMutation.mutate({ id: blogId })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the blog
            post
            <span className="font-semibold"> &quot;{blogTitle}&quot;</span> and
            remove all associated data including version history.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
