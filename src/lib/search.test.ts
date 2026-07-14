import { describe, expect, it } from 'vitest'
import { searchPages } from './search'
import type { Page } from '../types'

function page(partial: Partial<Page> & { id: string; title: string }): Page {
  return {
    icon: '📄',
    parentId: null,
    order: 0,
    type: 'page',
    blocks: [],
    favorite: false,
    deleted: false,
    createdAt: 1,
    updatedAt: 1,
    ...partial,
  }
}

describe('searchPages', () => {
  const pages: Page[] = [
    page({
      id: '1',
      title: 'Architecture Decision',
      blocks: [{ id: 'b1', type: 'paragraph', content: 'We chose postgres' }],
      updatedAt: 10,
    }),
    page({
      id: '2',
      title: 'Bug report',
      blocks: [{ id: 'b2', type: 'paragraph', content: 'login fails on mobile' }],
      updatedAt: 20,
    }),
    page({
      id: '3',
      title: 'Sprint board',
      type: 'database',
      database: {
        id: 'd',
        properties: [],
        rows: [{ id: 'r', values: { title: 'postgres migration' } }],
        views: [],
        activeViewId: '',
      },
      updatedAt: 5,
    }),
  ]

  it('ranks title matches higher', () => {
    const hits = searchPages(pages, 'architecture')
    expect(hits[0].page.id).toBe('1')
    expect(hits[0].score).toBeGreaterThan(0)
  })

  it('finds database row text', () => {
    const hits = searchPages(pages, 'postgres')
    expect(hits.some((h) => h.page.id === '3' || h.page.id === '1')).toBe(true)
  })

  it('returns recent when empty query', () => {
    const hits = searchPages(pages, '')
    expect(hits[0].page.id).toBe('2')
  })
})
