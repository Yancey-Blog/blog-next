import { describe, expect, it } from 'vitest'

import { isExpiredSubscriptionStatus } from '@/lib/services/push-status'

describe('isExpiredSubscriptionStatus', () => {
  it('treats 404 as expired', () => {
    expect(isExpiredSubscriptionStatus(404)).toBe(true)
  })

  it('treats 410 as expired', () => {
    expect(isExpiredSubscriptionStatus(410)).toBe(true)
  })

  it('does not treat other statuses as expired', () => {
    expect(isExpiredSubscriptionStatus(500)).toBe(false)
    expect(isExpiredSubscriptionStatus(400)).toBe(false)
    expect(isExpiredSubscriptionStatus(0)).toBe(false)
  })
})
