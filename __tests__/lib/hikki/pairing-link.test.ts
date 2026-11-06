import { describe, expect, it } from 'vitest'

import { createReviewerLink } from '@/lib/hikki/pairing-link'

describe('CMS reviewer invitations', () => {
  it('uses unique iOS records and secrets in a fragment, with a ten-minute expiry', () => {
    const first = createReviewerLink(1_800_000_000_000)
    const second = createReviewerLink(1_800_000_000_000)
    const url = new URL(first.url)
    expect(first.code).toMatch(
      /^device-registration-ios-[a-f0-9-]{36}\.[A-Za-z0-9_-]{43}$/
    )
    expect(first.expiresAt).toBe(1_800_000_600_000)
    expect(url.protocol).toBe('hikki:')
    expect(url.host).toBe('reviewer-pair')
    expect(url.search).toBe('')
    expect(url.hash).toBe(`#${first.code}.${first.expiresAt}`)
    expect(second.code).not.toBe(first.code)
  })
})
