import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import webpush, { type PushSubscription as WebPushSubscription } from 'web-push'

import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'

import { isExpiredSubscriptionStatus } from './push-status'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export interface SubscribeInput {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export interface SendResult {
  sent: number
  failed: number
}

export class PushSubscriptionService {
  static async subscribe(input: SubscribeInput): Promise<void> {
    const existing = await db
      .select({ id: schema.pushSubscriptions.id })
      .from(schema.pushSubscriptions)
      .where(eq(schema.pushSubscriptions.endpoint, input.endpoint))
      .limit(1)

    if (existing.length > 0) return

    await db.insert(schema.pushSubscriptions).values({
      id: uuidv4(),
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth
    })
  }

  static async unsubscribe(endpoint: string): Promise<void> {
    await db
      .delete(schema.pushSubscriptions)
      .where(eq(schema.pushSubscriptions.endpoint, endpoint))
  }

  static async count(): Promise<number> {
    const rows = await db
      .select({ id: schema.pushSubscriptions.id })
      .from(schema.pushSubscriptions)
    return rows.length
  }

  /**
   * Send a notification to every subscriber, pruning subscriptions that are
   * no longer valid (browser unsubscribed / uninstalled) as reported by the push service.
   */
  static async sendToAll(payload: {
    title: string
    body: string
  }): Promise<SendResult> {
    const subscriptions = await db.select().from(schema.pushSubscriptions)

    let sent = 0
    let failed = 0

    await Promise.all(
      subscriptions.map(async (sub) => {
        const pushSubscription: WebPushSubscription = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth }
        }

        try {
          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify({
              title: payload.title,
              body: payload.body,
              icon: '/icon-192x192.png'
            })
          )
          sent++
        } catch (error) {
          failed++
          const statusCode =
            error && typeof error === 'object' && 'statusCode' in error
              ? (error as { statusCode: number }).statusCode
              : 0

          if (isExpiredSubscriptionStatus(statusCode)) {
            await this.unsubscribe(sub.endpoint)
          } else {
            console.error('Push send failed:', error)
          }
        }
      })
    )

    return { sent, failed }
  }
}
