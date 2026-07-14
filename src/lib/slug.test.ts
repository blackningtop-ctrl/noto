import { describe, expect, it } from 'vitest'
import { slugify, uniqueSlug } from './slug'

describe('slugify', () => {
  it('slugifies titles', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('uniqueSlug avoids collisions', () => {
    const used = new Set<string>(['hello'])
    expect(uniqueSlug('Hello', used, 'abc')).toBe('hello-2')
  })
})
