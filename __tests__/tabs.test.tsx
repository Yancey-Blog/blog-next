// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

it.each([
  ['horizontal', 'ArrowRight'],
  ['vertical', 'ArrowDown']
] as const)(
  'uses %s orientation for tab semantics and keyboard navigation',
  async (orientation, key) => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    try {
      await act(async () =>
        root.render(
          <Tabs defaultValue="first" orientation={orientation}>
            <TabsList aria-label="Review state" activateOnFocus>
              <TabsTrigger value="first">Pending</TabsTrigger>
              <TabsTrigger value="second">Published</TabsTrigger>
            </TabsList>
            <TabsContent value="first">Pending content</TabsContent>
            <TabsContent value="second">Published content</TabsContent>
          </Tabs>
        )
      )
      expect(
        host
          .querySelector('[role="tablist"]')
          ?.getAttribute('aria-orientation') ?? 'horizontal'
      ).toBe(orientation)
      const tabs = host.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      await act(async () => tabs[0].focus())
      await act(async () => {
        tabs[0].dispatchEvent(
          new KeyboardEvent('keydown', { key, bubbles: true })
        )
      })
      expect(tabs[1].getAttribute('aria-selected')).toBe('true')
      expect(host.querySelector('[role="tabpanel"]')?.textContent).toBe(
        'Published content'
      )
    } finally {
      await act(async () => root.unmount())
      host.remove()
      vi.unstubAllGlobals()
    }
  }
)
