'use client'

import { useMutation } from '@tanstack/react-query'
import { Bell, BellOff } from 'lucide-react'
import { useEffect, useState } from 'react'

import { urlBase64ToUint8Array } from '@/lib/push-client'
import { useTRPC } from '@/lib/trpc/client'

export function PushNotificationManager() {
  const trpc = useTRPC()
  const [isSupported, setIsSupported] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null
  )

  const subscribeMutation = useMutation(trpc.push.subscribe.mutationOptions())
  const unsubscribeMutation = useMutation(
    trpc.push.unsubscribe.mutationOptions()
  )

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    setIsSupported(true)

    void navigator.serviceWorker
      .register('/service-worker.js', { scope: '/', updateViaCache: 'none' })
      .then(async (registration) => {
        const sub = await registration.pushManager.getSubscription()
        setSubscription(sub)
      })
  }, [])

  if (!isSupported) return null

  const isPending = subscribeMutation.isPending || unsubscribeMutation.isPending

  async function handleToggle() {
    if (subscription) {
      await subscription.unsubscribe()
      await unsubscribeMutation.mutateAsync({
        endpoint: subscription.endpoint
      })
      setSubscription(null)
      return
    }

    const registration = await navigator.serviceWorker.ready
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      ) as BufferSource
    })
    const json = sub.toJSON()
    await subscribeMutation.mutateAsync({
      endpoint: sub.endpoint,
      keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth }
    })
    setSubscription(sub)
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      aria-label={
        subscription
          ? 'Unsubscribe from notifications'
          : 'Subscribe to notifications'
      }
      className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
    >
      {subscription ? (
        <Bell className="h-4 w-4" />
      ) : (
        <BellOff className="h-4 w-4" />
      )}
    </button>
  )
}
