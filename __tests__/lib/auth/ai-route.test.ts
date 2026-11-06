import { afterEach, describe, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ session: vi.fn(), stream: vi.fn() }))
vi.mock('next/headers', () => ({
  headers: () => Promise.resolve(new Headers())
}))
vi.mock('@/lib/auth', () => ({ auth: { api: { getSession: state.session } } }))
vi.mock('@ai-sdk/openai', () => ({ createOpenAI: () => () => ({}) }))
vi.mock('@blocknote/xl-ai/server', () => ({
  aiDocumentFormats: { html: { systemPrompt: 'fixture' } },
  injectDocumentStateMessages: (messages: unknown) => messages,
  toolDefinitionsToToolSet: () => ({})
}))
vi.mock('ai', () => ({
  convertToModelMessages: () => Promise.resolve([]),
  streamText: state.stream
}))
vi.mock('@/lib/services/settings.service', () => ({
  SettingsService: { getAIModel: () => Promise.resolve('fixture-model') }
}))
import { POST } from '@/app/api/ai/chat/route'
afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetAllMocks()
})
describe('blog AI HTTP authorization', () => {
  it('rejects a historical non-admin session before reading input or invoking the provider', async () => {
    vi.stubEnv('ADMIN_EMAILS', 'owner@example.com')
    state.session.mockResolvedValue({
      session: { id: 'foreign-session' },
      user: { email: 'stranger@example.com', emailVerified: true }
    })
    const response = await POST(
      new Request('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: 'invalid-json-is-never-read'
      })
    )
    expect(response.status).toBe(401)
    expect(state.stream).not.toHaveBeenCalled()
  })
  it('preserves the whitelisted owner flow using a local mock provider', async () => {
    vi.stubEnv('ADMIN_EMAILS', 'owner@example.com')
    state.session.mockResolvedValue({
      session: { id: 'owner-session' },
      user: { email: 'owner@example.com', emailVerified: true }
    })
    state.stream.mockReturnValue({
      toUIMessageStreamResponse: () => new Response('fixture-stream')
    })
    const response = await POST(
      new Request('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [], toolDefinitions: {} })
      })
    )
    expect(response.status).toBe(200)
    expect(state.stream).toHaveBeenCalledOnce()
  })
})
