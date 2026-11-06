import { createHash, timingSafeEqual } from 'node:crypto'

import { type CloudKitRecord } from './cloudkit'

export const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex')
export const secretMatches = (secret: unknown, expected: unknown) => {
  if (
    typeof secret !== 'string' ||
    !/^[A-Za-z0-9_-]{43}$/u.test(secret) ||
    typeof expected !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(expected)
  )
    return false
  return timingSafeEqual(Buffer.from(digest(secret)), Buffer.from(expected))
}
/** Versioned native iOS registrations exclude every legacy Mac/unknown-platform token without a schema migration. */
export const isIOSRegistration = (id: unknown): id is string =>
  typeof id === 'string' &&
  /^device-registration-ios-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/u.test(
    id
  )

export function registrationIdentity(record: CloudKitRecord) {
  const owner = record.created?.userRecordName
  const token = record.fields?.token?.value
  const environment = record.fields?.environment?.value
  const topic = record.fields?.topic?.value
  if (
    !owner ||
    typeof token !== 'string' ||
    !/^[a-f0-9]{64,256}$/u.test(token) ||
    (environment !== 'sandbox' && environment !== 'production') ||
    topic !== 'app.yancey.hikki'
  )
    throw new Error('Invalid device registration')
  return {
    account: `cloud:${owner}`,
    token,
    environment: String(environment),
    topic,
    id: `device-${digest(`${topic}:${environment}:${token}`)}`
  }
}
