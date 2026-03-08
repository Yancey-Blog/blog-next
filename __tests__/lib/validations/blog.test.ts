import {
  createBlogSchema,
  getBlogsQuerySchema,
  updateBlogSchema
} from '@/lib/validations/blog'
import { describe, expect, it } from 'vitest'

const validBlog = {
  title: 'Hello World',
  content: '<p>Some content</p>',
  summary: 'A short summary',
  coverImage: 'https://example.com/image.jpg',
  published: false
}

describe('createBlogSchema', () => {
  it('accepts valid blog data', () => {
    expect(() => createBlogSchema.parse(validBlog)).not.toThrow()
  })

  it('defaults published to false', () => {
    const result = createBlogSchema.parse({
      ...validBlog,
      published: undefined
    })
    expect(result.published).toBe(false)
  })

  it('rejects empty title', () => {
    expect(() => createBlogSchema.parse({ ...validBlog, title: '' })).toThrow()
  })

  it('rejects title over 200 characters', () => {
    expect(() =>
      createBlogSchema.parse({ ...validBlog, title: 'a'.repeat(201) })
    ).toThrow()
  })

  it('rejects empty content', () => {
    expect(() =>
      createBlogSchema.parse({ ...validBlog, content: '' })
    ).toThrow()
  })

  it('rejects summary over 500 characters', () => {
    expect(() =>
      createBlogSchema.parse({ ...validBlog, summary: 'a'.repeat(501) })
    ).toThrow()
  })

  it('rejects invalid coverImage URL', () => {
    expect(() =>
      createBlogSchema.parse({ ...validBlog, coverImage: 'not-a-url' })
    ).toThrow()
  })
})

describe('updateBlogSchema', () => {
  it('allows partial updates', () => {
    expect(() => updateBlogSchema.parse({ title: 'New Title' })).not.toThrow()
    expect(() => updateBlogSchema.parse({ published: true })).not.toThrow()
    expect(() => updateBlogSchema.parse({})).not.toThrow()
  })

  it('still validates when fields are provided', () => {
    expect(() => updateBlogSchema.parse({ title: '' })).toThrow()
  })
})

describe('getBlogsQuerySchema', () => {
  it('uses defaults when no input', () => {
    const result = getBlogsQuerySchema.parse({})
    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(10)
  })

  it('coerces string numbers', () => {
    const result = getBlogsQuerySchema.parse({ page: '2', pageSize: '20' })
    expect(result.page).toBe(2)
    expect(result.pageSize).toBe(20)
  })

  it('rejects page less than 1', () => {
    expect(() => getBlogsQuerySchema.parse({ page: 0 })).toThrow()
  })

  it('rejects pageSize greater than 100', () => {
    expect(() => getBlogsQuerySchema.parse({ pageSize: 101 })).toThrow()
  })

  it('accepts optional search', () => {
    const result = getBlogsQuerySchema.parse({ search: 'hello' })
    expect(result.search).toBe('hello')
  })

  it('accepts optional published filter', () => {
    const result = getBlogsQuerySchema.parse({ published: 'true' })
    expect(result.published).toBe(true)
  })
})
