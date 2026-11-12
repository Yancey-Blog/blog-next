import { CloudKitRequestError } from './cloudkit'

/** Fixed publication stage and schema-only diagnostics, safe for the protected CMS. */
export class ReviewPublicationError extends Error {
  constructor(
    readonly stage: string,
    cause: unknown,
    readonly diagnostic = ''
  ) {
    const status = cause instanceof CloudKitRequestError ? cause.status : 502
    super(`Publication failed during ${stage} (${status})`, { cause })
    this.name = 'ReviewPublicationError'
  }
}
