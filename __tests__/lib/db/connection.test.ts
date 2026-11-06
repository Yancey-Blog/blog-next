import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const driver = vi.hoisted(() => ({
  create: vi.fn<(...args: unknown[]) => object>(() => ({}))
}))
vi.mock('postgres', () => ({ default: driver.create }))
vi.mock('drizzle-orm/postgres-js', () => ({ drizzle: vi.fn() }))

const runtime = globalThis as typeof globalThis & { __dbClient?: unknown }

beforeEach(() => {
  delete runtime.__dbClient
  driver.create.mockClear()
  vi.resetModules()
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubEnv('VERCEL', '1')
})
afterEach(() => {
  delete runtime.__dbClient
  vi.unstubAllEnvs()
})

describe('serverless database connections', () => {
  it('uses transaction pooling for the Supabase shared pooler on Vercel', async () => {
    const url =
      'postgres://test:fixture@aws-0-region.pooler.supabase.com:5432/postgres?sslmode=require'
    vi.stubEnv('DATABASE_URL', url)
    await import('@/lib/db')
    const [connection, options] = driver.create.mock.calls[0] as unknown as [
      string,
      Record<string, unknown>
    ]
    const actual = new URL(connection)
    expect(actual.port).toBe('6543')
    expect(actual.username).toBe('test')
    expect(actual.password).toBe('fixture')
    expect(actual.searchParams.get('sslmode')).toBe('require')
    expect(options).toMatchObject({
      prepare: false,
      max_pipeline: 1,
      idle_timeout: 5,
      max_lifetime: 60
    })
  })

  it('shares a client across production module reloads', async () => {
    vi.stubEnv(
      'DATABASE_URL',
      'postgres://test:fixture@localhost:5432/postgres'
    )
    await import('@/lib/db')
    vi.resetModules()
    await import('@/lib/db')
    expect(driver.create).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['postgres://test:fixture@localhost:5432/postgres', '1'],
    ['postgres://test:fixture@db.project.supabase.co:5432/postgres', '1'],
    [
      'postgres://test:fixture@fake.pooler.supabase.com.example:5432/postgres',
      '1'
    ],
    [
      'postgres://test:fixture@aws-0-region.pooler.supabase.com:5432/postgres',
      ''
    ],
    [
      'postgres://test:fixture@aws-0-region.pooler.supabase.com:6543/postgres',
      '1'
    ]
  ])(
    'preserves explicitly configured connections outside Vercel session pooling (%s)',
    async (url, vercel) => {
      vi.stubEnv('DATABASE_URL', url)
      vi.stubEnv('VERCEL', vercel)
      await import('@/lib/db')
      expect(driver.create.mock.calls[0]?.[0]).toBe(url)
    }
  )
})
