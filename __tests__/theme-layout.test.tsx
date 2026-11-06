// @vitest-environment jsdom

import { useTheme } from 'next-themes'
import { act, type ReactNode } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/app/globals.css', () => ({}))
vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: 'font-sans' }),
  Geist_Mono: () => ({ variable: 'font-mono' })
}))
vi.mock('@vercel/analytics/next', () => ({ Analytics: () => null }))
vi.mock('@vercel/speed-insights/next', () => ({ SpeedInsights: () => null }))
vi.mock('@/lib/trpc/client', () => ({
  TRPCReactProvider: ({ children }: { children: ReactNode }) => children
}))

import RootLayout from '@/app/layout'

function RouteContent({ page }: { page: string }) {
  const { setTheme } = useTheme()
  return <button onClick={() => setTheme('dark')}>{page}</button>
}

let root: Root | undefined

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  localStorage.clear()
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn()
    }))
  )
})

afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  root = undefined
  vi.unstubAllGlobals()
})

describe('root theme lifetime', () => {
  it('hydrates the initial theme script and keeps it when a route layout mounts', async () => {
    const login = RootLayout({
      children: <RouteContent key="login" page="Login" />
    })
    document.open()
    document.write(`<!doctype html>${renderToString(login)}`)
    document.close()

    const script = document.querySelector('script')
    expect(script?.textContent).toContain('blog-admin-theme-mode')
    expect(document.querySelectorAll('script')).toHaveLength(1)

    await act(async () => {
      root = hydrateRoot(document, login)
    })
    await act(async () => {
      document
        .querySelector('button')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('blog-admin-theme-mode')).toBe('dark')

    await act(async () =>
      root?.render(
        RootLayout({ children: <RouteContent key="cms" page="CMS" /> })
      )
    )
    expect(document.querySelector('button')?.textContent).toBe('CMS')
    expect(document.querySelector('script')).toBe(script)
    expect(document.querySelectorAll('script')).toHaveLength(1)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
