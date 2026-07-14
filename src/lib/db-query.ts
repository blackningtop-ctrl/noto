import type { Database, DbRow, Property } from '../types'

export type SortKey = 'title' | 'none' | string // property id
export type SortDir = 'asc' | 'desc'

export function filterAndSortRows(
  db: Database,
  opts: {
    query: string
    sortKey: SortKey
    sortDir: SortDir
    /** propertyId -> optionId or text contains */
    propFilters?: Record<string, string>
  },
): DbRow[] {
  const q = opts.query.trim().toLowerCase()
  let rows = [...db.rows]

  if (q) {
    rows = rows.filter((r) => {
      const title = String(r.values.title ?? '').toLowerCase()
      if (title.includes(q)) return true
      return db.properties.some((p) =>
        String(r.values[p.id] ?? '')
          .toLowerCase()
          .includes(q),
      )
    })
  }

  if (opts.propFilters) {
    for (const [propId, val] of Object.entries(opts.propFilters)) {
      if (!val) continue
      const prop = db.properties.find((p) => p.id === propId)
      rows = rows.filter((r) => {
        const cell = r.values[propId]
        if (prop?.type === 'select' || prop?.type === 'status') {
          return String(cell ?? '') === val
        }
        return String(cell ?? '')
          .toLowerCase()
          .includes(val.toLowerCase())
      })
    }
  }

  if (opts.sortKey && opts.sortKey !== 'none') {
    const dir = opts.sortDir === 'desc' ? -1 : 1
    const key = opts.sortKey
    rows.sort((a, b) => {
      const av = key === 'title' ? a.values.title : a.values[key]
      const bv = key === 'title' ? b.values.title : b.values[key]
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av ?? '').localeCompare(String(bv ?? ''), 'ko') * dir
    })
  }

  return rows
}

export function sortLabel(prop: Property | undefined, key: SortKey): string {
  if (key === 'title') return '이름'
  if (key === 'none') return '정렬 없음'
  return prop?.name ?? key
}
