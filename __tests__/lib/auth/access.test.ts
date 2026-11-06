import { afterEach, describe, expect, it, vi } from 'vitest'

import { isAdminEmail, isAdminUser } from '@/lib/auth/access'
import {
  adminDatabaseHooks,
  assertAdminIdentity
} from '@/lib/auth/provisioning'

afterEach(() => vi.unstubAllEnvs())
describe('administrator identity boundaries', () => {
  it('normalizes the live allowlist and requires a verified provider email', () => {
    vi.stubEnv('ADMIN_EMAILS', ' Owner@example.com , second@example.com ')
    expect(isAdminEmail('OWNER@example.com')).toBe(true)
    expect(
      isAdminUser({ email: 'owner@example.com', emailVerified: false })
    ).toBe(false)
    expect(
      isAdminUser({ email: 'stranger@example.com', emailVerified: true })
    ).toBe(false)
    expect(() =>
      assertAdminIdentity({
        email: 'stranger@example.com',
        emailVerified: true
      })
    ).toThrow('Only authorized')
    expect(() =>
      assertAdminIdentity({ email: 'owner@example.com', emailVerified: true })
    ).not.toThrow()
    vi.stubEnv('ADMIN_EMAILS', '')
    expect(
      isAdminUser({ email: 'owner@example.com', emailVerified: true })
    ).toBe(false)
  })
  it('rejects unknown users before persistence on every provisioning path', () => {
    vi.stubEnv('ADMIN_EMAILS', 'owner@example.com')
    const hooks = adminDatabaseHooks(vi.fn())
    const stranger = {
      id: 'stranger',
      email: 'stranger@example.com',
      emailVerified: true,
      name: 'Visitor',
      createdAt: new Date(),
      updatedAt: new Date()
    }
    expect(() => hooks.user.create.before(stranger)).toThrow('Only authorized')
    expect(() => hooks.user.update.before({ email: stranger.email })).toThrow(
      'unauthorized account'
    )
    expect(() => hooks.user.update.before({ emailVerified: false })).toThrow(
      'unauthorized account'
    )
  })
  it('blocks session issuance for historical users, removed admins and passkey sign-ins', async () => {
    vi.stubEnv('ADMIN_EMAILS', 'owner@example.com')
    const lookup = vi
      .fn()
      .mockResolvedValue({ email: 'stranger@example.com', emailVerified: true })
    const hooks = adminDatabaseHooks(lookup)
    const session = {
      id: 's',
      userId: 'stranger',
      token: 'fixture',
      expiresAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }
    await expect(hooks.session.create.before(session)).rejects.toThrow(
      'Only authorized'
    )
    lookup.mockResolvedValue({
      email: 'owner@example.com',
      emailVerified: true
    })
    expect((await hooks.session.create.before(session)).data).toEqual(session)
    vi.stubEnv('ADMIN_EMAILS', '')
    await expect(hooks.session.create.before(session)).rejects.toThrow(
      'Only authorized'
    )
  })
})
