import { describe, expect, it } from 'vitest'

import { cn, toContainsPattern } from '@/lib/utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('deduplicates conflicting Tailwind classes', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('handles conditional classes', () => {
    const isHidden = false
    const isActive = true
    expect(cn('base', isHidden && 'hidden', 'end')).toBe('base end')
    expect(cn('base', isActive && 'active')).toBe('base active')
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

describe('toContainsPattern', () => {
  it('trims the input and wraps it in wildcards', () => {
    expect(toContainsPattern('  HTTPS 安全  ')).toBe('%HTTPS 安全%')
  })

  it('returns null for blank input', () => {
    expect(toContainsPattern(undefined)).toBeNull()
    expect(toContainsPattern('   ')).toBeNull()
  })

  it('escapes LIKE wildcards so they match literally', () => {
    expect(toContainsPattern('100%_done\\')).toBe('%100\\%\\_done\\\\%')
  })
})
