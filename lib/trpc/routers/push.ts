import { z } from 'zod'

import { PushSubscriptionService } from '@/lib/services/push-subscription.service'

import { protectedProcedure, publicProcedure } from '../init'

export const pushRouter = {
  subscribe: publicProcedure
    .input(
      z.object({
        endpoint: z.string().url(),
        keys: z.object({
          p256dh: z.string().min(1),
          auth: z.string().min(1)
        })
      })
    )
    .mutation(async ({ input }) => {
      await PushSubscriptionService.subscribe(input)
      return { ok: true }
    }),

  unsubscribe: publicProcedure
    .input(z.object({ endpoint: z.string().url() }))
    .mutation(async ({ input }) => {
      await PushSubscriptionService.unsubscribe(input.endpoint)
      return { ok: true }
    }),

  subscriberCount: protectedProcedure.query(async () => {
    return { count: await PushSubscriptionService.count() }
  }),

  sendTest: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(100),
        body: z.string().min(1).max(500)
      })
    )
    .mutation(async ({ input }) => {
      return await PushSubscriptionService.sendToAll(input)
    })
}
