import { describe, expect, it } from 'vitest'

import { selectChatModels } from '@/lib/ai/models'

describe('selectChatModels', () => {
  it('keeps chat models only', () => {
    const ids = selectChatModels([
      { id: 'gpt-5.5', created: 3 },
      { id: 'o3', created: 2 },
      { id: 'text-embedding-3-large', created: 9 },
      { id: 'gpt-4o-realtime-preview', created: 8 },
      { id: 'gpt-image-1', created: 7 },
      { id: 'tts-1', created: 6 },
      { id: 'whisper-1', created: 5 },
      { id: 'dall-e-3', created: 4 }
    ]).map((m) => m.id)
    expect(ids).toEqual(['gpt-5.5', 'o3'])
  })

  it('sorts newest first, with retiring models last', () => {
    const ids = selectChatModels([
      { id: 'gpt-4.1', created: 1 },
      { id: 'gpt-4o', created: 5, shutdown_date: '2026-12-01' },
      { id: 'gpt-5.5', created: 3 }
    ]).map((m) => m.id)
    expect(ids).toEqual(['gpt-5.5', 'gpt-4.1', 'gpt-4o'])
  })
})
