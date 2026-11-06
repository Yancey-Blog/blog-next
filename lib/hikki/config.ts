import { TRPCError } from '@trpc/server'

import { cloudKitConfig } from './cloudkit'

export function hikkiConfig() {
  const config = cloudKitConfig({
    CLOUDKIT_CONTAINER_ID: process.env.HIKKI_CLOUDKIT_CONTAINER_ID,
    VITE_CLOUDKIT_ENV: process.env.HIKKI_CLOUDKIT_ENV ?? 'production',
    CLOUDKIT_KEY_ID: process.env.HIKKI_CLOUDKIT_KEY_ID,
    CLOUDKIT_PRIVATE_KEY_BASE64: process.env.HIKKI_CLOUDKIT_PRIVATE_KEY_BASE64
  })
  if (!config)
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message:
        'Hikki CloudKit credentials are not configured in the CMS project.'
    })
  return config
}
