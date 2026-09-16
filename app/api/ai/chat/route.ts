import { createOpenAI } from '@ai-sdk/openai'
import {
  aiDocumentFormats,
  injectDocumentStateMessages,
  toolDefinitionsToToolSet
} from '@blocknote/xl-ai/server'
import { convertToModelMessages, streamText } from 'ai'

import { requireAuth } from '@/lib/auth/session'

export const maxDuration = 30

const openai = createOpenAI({ apiKey: process.env.OPENAI_PRIVATE_KEY })

export async function POST(req: Request) {
  try {
    await requireAuth()
  } catch {
    return new Response('Unauthorized', { status: 401 })
  }

  const { messages, toolDefinitions } = await req.json()

  const result = streamText({
    model: openai('gpt-4.1'),
    system: aiDocumentFormats.html.systemPrompt,
    messages: await convertToModelMessages(
      injectDocumentStateMessages(messages)
    ),
    tools: toolDefinitionsToToolSet(toolDefinitions),
    toolChoice: 'required'
  })

  return result.toUIMessageStreamResponse()
}
