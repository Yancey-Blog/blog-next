import {
  cloudKitRequest,
  CloudKitRequestError,
  type CloudKitConfig
} from './cloudkit'

/** Resolve the server key's own principal; never search other users by email. */
export async function serverIdentity(
  config: CloudKitConfig,
  fetcher?: typeof fetch
) {
  let userRecordName: unknown
  try {
    const result = await cloudKitRequest<{
      users?: Array<{ userRecordName?: unknown }>
    }>(config, 'users/caller', undefined, fetcher)
    if (Array.isArray(result.users) && result.users.length > 1)
      throw new CloudKitRequestError(502, {
        serverErrorCode: 'AMBIGUOUS_CALLER'
      })
    userRecordName = Array.isArray(result.users)
      ? result.users[0]?.userRecordName
      : undefined
    if (userRecordName === undefined)
      console.warn('Hikki CloudKit caller identity unavailable', {
        hasUsersArray: Array.isArray(result.users),
        userCount: Array.isArray(result.users) ? result.users.length : null
      })
  } catch (error) {
    if (
      !(error instanceof CloudKitRequestError) ||
      error.status === 401 ||
      error.status === 403 ||
      error.serverCode === 'AUTHENTICATION_FAILED' ||
      error.serverCode === 'ACCESS_DENIED' ||
      error.serverCode === 'AMBIGUOUS_CALLER'
    )
      throw error
  }
  // The older documented endpoint is a compatibility fallback for a server
  // principal that has no discoverable caller identity. Both resolve this key only.
  if (userRecordName === undefined) {
    const result = await cloudKitRequest<{ userRecordName?: unknown }>(
      config,
      'users/current',
      undefined,
      fetcher
    )
    userRecordName = result.userRecordName
  }
  if (
    typeof userRecordName !== 'string' ||
    !/^[\w-]{1,128}$/u.test(userRecordName)
  ) {
    console.warn('Hikki CloudKit server identity invalid', {
      hasRecordName: typeof userRecordName === 'string'
    })
    throw new CloudKitRequestError(502)
  }
  return {
    containerId: config.containerId,
    environment: config.environment,
    userRecordName
  }
}
