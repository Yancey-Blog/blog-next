// @vitest-environment jsdom

import { act } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const theme = vi.hoisted(() => ({
  resolvedTheme: undefined as string | undefined
}))
vi.mock('next-themes', () => ({ useTheme: () => theme }))
vi.mock('@/lib/auth/auth-client', () => ({
  authClient: { signIn: { social: vi.fn(), passkey: vi.fn() } }
}))

import { LoginForm } from '@/components/login-form'

let container: HTMLDivElement
let root: Root | undefined

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  theme.resolvedTheme = undefined
  container = document.createElement('div')
  document.body.appendChild(container)
})

afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  root = undefined
  container.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('login form hydration', () => {
  it.each(['dark', 'light'])(
    'hydrates without mismatches when the browser resolves %s mode',
    async (mode) => {
      // The server cannot know the browser's saved theme or system preference.
      container.innerHTML = renderToString(<LoginForm />)
      theme.resolvedTheme = mode
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      const recoverableError = vi.fn()

      await act(async () => {
        root = hydrateRoot(container, <LoginForm />, {
          onRecoverableError: recoverableError
        })
      })

      expect(consoleError).not.toHaveBeenCalled()
      expect(recoverableError).not.toHaveBeenCalled()
      const labels = Array.from(
        container.querySelectorAll('button'),
        (button) => button.textContent?.trim()
      )
      expect(labels).toEqual([
        'Sign in with Google',
        'Sign in with GitHub',
        'Sign in with Apple',
        'Sign in with Passkey'
      ])
    }
  )
})
