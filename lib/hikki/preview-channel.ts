export const HIKKI_READER_ORIGIN = 'https://hikki.yancey.app'

/** Messages cannot mark a document reviewed unless they came from this exact cross-origin frame. */
export function readerMessage(
  event: Pick<MessageEvent, 'origin' | 'source' | 'data'>,
  source: unknown,
  nonce: string
) {
  if (
    !source ||
    event.origin !== HIKKI_READER_ORIGIN ||
    event.source !== source ||
    !event.data ||
    typeof event.data !== 'object'
  )
    return null
  if (event.data.type === 'hikki.preview.ready') return 'ready'
  if (event.data.nonce !== nonce) return null
  if (event.data.type === 'hikki.preview.rendered') return 'rendered'
  if (event.data.type === 'hikki.preview.failed') return 'failed'
  return null
}
