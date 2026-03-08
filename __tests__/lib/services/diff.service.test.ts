import { DiffService } from '@/lib/services/diff.service'
import { describe, expect, it } from 'vitest'

const base = {
  title: 'Hello World',
  summary: 'A short summary',
  content: 'Line one\nLine two\nLine three',
  coverImage: 'https://example.com/cover.jpg'
}

describe('DiffService.compareBlogVersions', () => {
  it('returns no changes when versions are identical', () => {
    const diff = DiffService.compareBlogVersions(base, base)
    expect(diff.title.every((c) => !c.added && !c.removed)).toBe(true)
    expect(diff.content.every((c) => !c.added && !c.removed)).toBe(true)
    expect(diff.coverImage.changed).toBe(false)
  })

  it('detects title change', () => {
    const diff = DiffService.compareBlogVersions(base, {
      ...base,
      title: 'Hello Vitest'
    })
    const hasChange = diff.title.some((c) => c.added || c.removed)
    expect(hasChange).toBe(true)
  })

  it('detects content change', () => {
    const diff = DiffService.compareBlogVersions(base, {
      ...base,
      content: 'Line one\nLine two changed\nLine three'
    })
    const hasChange = diff.content.some((c) => c.added || c.removed)
    expect(hasChange).toBe(true)
  })

  it('detects coverImage change', () => {
    const diff = DiffService.compareBlogVersions(base, {
      ...base,
      coverImage: 'https://example.com/new-cover.jpg'
    })
    expect(diff.coverImage.changed).toBe(true)
    expect(diff.coverImage.old).toBe(base.coverImage)
    expect(diff.coverImage.new).toBe('https://example.com/new-cover.jpg')
  })

  it('handles null summary', () => {
    const diff = DiffService.compareBlogVersions(
      { ...base, summary: null },
      { ...base, summary: null }
    )
    expect(diff.summary.every((c) => !c.added && !c.removed)).toBe(true)
  })
})

describe('DiffService.getChangeSummary', () => {
  it('returns "No changes" for identical versions', () => {
    const diff = DiffService.compareBlogVersions(base, base)
    expect(DiffService.getChangeSummary(diff)).toBe('No changes')
  })

  it('lists changed fields', () => {
    const diff = DiffService.compareBlogVersions(base, {
      ...base,
      title: 'New Title',
      coverImage: 'https://example.com/new.jpg'
    })
    const summary = DiffService.getChangeSummary(diff)
    expect(summary).toContain('title')
    expect(summary).toContain('cover image')
  })
})

describe('DiffService.countChanges', () => {
  it('returns zero counts for unchanged content', () => {
    const diff = DiffService.compareBlogVersions(base, base)
    const { additions, deletions } = DiffService.countChanges(diff.content)
    expect(additions).toBe(0)
    expect(deletions).toBe(0)
  })

  it('counts additions and deletions by character length', () => {
    const diff = DiffService.compareBlogVersions(
      { ...base, title: 'Old' },
      { ...base, title: 'New Title' }
    )
    const { additions, deletions } = DiffService.countChanges(diff.title)
    expect(additions).toBeGreaterThan(0)
    expect(deletions).toBeGreaterThan(0)
  })
})
