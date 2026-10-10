/**
 * Model selection for the editor AI (BlockNote AI menu and "AI polish").
 * The API key stays in OPENAI_PRIVATE_KEY; the model is picked in Settings.
 */

/** Used until a model is picked in Settings. */
export const DEFAULT_AI_MODEL = 'gpt-5.5'

export interface OpenAIModel {
  id: string
  created: number
  shutdown_date?: string | null
}

// OpenAI's /models lists every model the key can use, including embeddings,
// speech, image and realtime models that can't drive a text tool-calling chat.
const CHAT_MODEL = /^(gpt-|o\d|chatgpt-)/
const NOT_CHAT =
  /(audio|realtime|transcribe|tts|image|search|embedding|instruct|moderation|codex)/

/**
 * Keeps the chat models, newest first; models with an announced retirement
 * (`shutdown_date`) sink below every current one.
 */
export function selectChatModels(models: OpenAIModel[]): OpenAIModel[] {
  return models
    .filter((m) => CHAT_MODEL.test(m.id) && !NOT_CHAT.test(m.id))
    .toSorted((a, b) => {
      const aRetiring = a.shutdown_date != null
      const bRetiring = b.shutdown_date != null
      if (aRetiring !== bRetiring) return aRetiring ? 1 : -1
      return b.created - a.created
    })
}

export async function listOpenAIChatModels(): Promise<OpenAIModel[]> {
  const apiKey = process.env.OPENAI_PRIVATE_KEY
  if (!apiKey) throw new Error('OPENAI_PRIVATE_KEY is not set')

  const response = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` }
  })
  if (!response.ok) {
    throw new Error(
      `OpenAI list-models failed (${response.status}): ${await response.text()}`
    )
  }

  const { data } = (await response.json()) as { data: OpenAIModel[] }
  return selectChatModels(data)
}
