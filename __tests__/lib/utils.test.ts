import { cn } from '@/lib/utils'
import { describe, expect, it } from 'vitest'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('deduplicates conflicting Tailwind classes', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'end')).toBe('base end')
    expect(cn('base', true && 'active')).toBe('base active')
  })

  it('handles undefined and null', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar')
  })

  it('returns empty string for no input', () => {
    expect(cn()).toBe('')
  })

  it('handles object syntax', () => {
    expect(cn({ 'font-bold': true, italic: false })).toBe('font-bold')
  })

  it('handles array syntax', () => {
    expect(cn(['px-2', 'py-1'])).toBe('px-2 py-1')
  })
})
