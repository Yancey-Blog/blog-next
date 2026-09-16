import { describe, expect, it } from 'vitest'

import { urlBase64ToUint8Array } from '@/lib/push-client'

describe('urlBase64ToUint8Array', () => {
  it('decodes a base64url string into bytes', () => {
    // "hello" base64url-encoded, no padding
    const result = urlBase64ToUint8Array('aGVsbG8')
    expect(Array.from(result)).toEqual([104, 101, 108, 108, 111])
  })

  it('handles the URL-safe characters "-" and "_"', () => {
    // Bytes 0xfb 0xff, base64 "-_8" (URL-safe) vs "+/8" (standard)
    const result = urlBase64ToUint8Array('-_8')
    expect(Array.from(result)).toEqual([251, 255])
  })
})
