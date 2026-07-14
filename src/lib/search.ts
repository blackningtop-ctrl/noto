import type { Page } from '../types'

export interface SearchHit {
  page: Page
  score: number
  snippet: string
  match: 'title' | 'block' | 'database' | 'mixed'
}

export function searchPages(pages: Page[], query: string, limit = 40): SearchHit[] {
  const q = query.trim().toLowerCase()
  if (!q) {
    return pages
      .slice()
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit)
      .map((page) => ({
        page,
        score: 0,
        snippet: page.type === 'database' ? '데이터베이스' : '최근 문서',
        match: 'title' as const,
      }))
  }

  const tokens = q.split(/\s+/).filter(Boolean)
  const hits: SearchHit[] = []

  for (const page of pages) {
    let score = 0
    let snippet = ''
    let match: SearchHit['match'] = 'title'
    const title = page.title.toLowerCase()

    for (const t of tokens) {
      if (title === t) score += 100
      else if (title.startsWith(t)) score += 60
      else if (title.includes(t)) score += 40
    }

    for (const b of page.blocks) {
      const c = (b.content || '').toLowerCase()
      for (const t of tokens) {
        if (c.includes(t)) {
          score += 8
          if (!snippet) {
            const idx = c.indexOf(t)
            snippet = b.content.slice(Math.max(0, idx - 24), idx + t.length + 40)
            match = score >= 40 ? 'mixed' : 'block'
          }
        }
      }
      if (b.type === 'code' || b.type === 'api' || b.type === 'git') score += 1
    }

    if (page.database) {
      for (const r of page.database.rows) {
        const rowText = Object.values(r.values)
          .map((v) => String(v ?? ''))
          .join(' ')
          .toLowerCase()
        for (const t of tokens) {
          if (rowText.includes(t)) {
            score += 10
            if (!snippet) {
              snippet = String(r.values.title ?? rowText).slice(0, 80)
              match = score >= 40 ? 'mixed' : 'database'
            }
          }
        }
      }
    }

    if (score > 0) {
      hits.push({
        page,
        score,
        snippet: snippet || (page.type === 'database' ? '데이터베이스 매치' : '본문 매치'),
        match: title.includes(tokens[0]) ? (snippet ? 'mixed' : 'title') : match,
      })
    }
  }

  return hits.sort((a, b) => b.score - a.score || b.page.updatedAt - a.page.updatedAt).slice(0, limit)
}
