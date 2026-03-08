'use client'

import { useTRPC } from '@/lib/trpc/client'
import { useMutation } from '@tanstack/react-query'
import { Heart, Twitter } from 'lucide-react'
import { useEffect, useState } from 'react'

interface PostActionsProps {
  blogId: string
  initialLikes: number
  title: string
  url: string
}

export function PostActions({
  blogId,
  initialLikes,
  title,
  url
}: PostActionsProps) {
  const [likes, setLikes] = useState(initialLikes)
  const [liked, setLiked] = useState(false)
  const trpc = useTRPC()

  const viewMutation = useMutation(trpc.blog.view.mutationOptions())

  // Increment PV on mount (every page visit)
  useEffect(() => {
    viewMutation.mutate({ id: blogId })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blogId])

  // Check sessionStorage on mount - resets on page refresh by design
  useEffect(() => {
    const key = `liked:${blogId}`
    setLiked(sessionStorage.getItem(key) === '1')
  }, [blogId])

  const likeMutation = useMutation(
    trpc.blog.like.mutationOptions({
      onSuccess: (data: { like: number }) => {
        // Reconcile with server value
        setLikes(data.like)
        sessionStorage.setItem(`liked:${blogId}`, '1')
      },
      onError: () => {
        // Revert optimistic update
        setLikes((prev) => prev - 1)
        setLiked(false)
      }
    })
  )

  const handleLike = () => {
    if (liked || likeMutation.isPending) return
    // Optimistic update
    setLikes((prev) => prev + 1)
    setLiked(true)
    likeMutation.mutate({ id: blogId })
  }

  const handleTwitterShare = () => {
    const text = encodeURIComponent(`${title}\n\n${url}\n\nvia @YanceyOfficial`)
    window.open(
      `https://twitter.com/intent/tweet?text=${text}`,
      '_blank',
      'noopener,noreferrer'
    )
  }

  return (
    <div className="flex items-center gap-3">
      {/* Like */}
      <button
        type="button"
        onClick={handleLike}
        disabled={liked || likeMutation.isPending}
        className={`group flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 ${
          liked
            ? 'border-rose-500/40 bg-rose-500/10 text-rose-500 cursor-default'
            : 'border-border bg-background text-muted-foreground hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-500'
        }`}
        aria-label={liked ? 'Liked' : 'Like this post'}
      >
        <Heart
          className={`h-4 w-4 transition-transform ${liked ? 'fill-rose-500' : 'group-hover:scale-110'}`}
        />
        <span>{likes.toLocaleString()}</span>
      </button>

      {/* Twitter share */}
      <button
        type="button"
        onClick={handleTwitterShare}
        className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-500"
        aria-label="Share on Twitter"
      >
        <Twitter className="h-4 w-4" />
        <span>Share</span>
      </button>
    </div>
  )
}
