import type { AppSettings, Page } from '../types'
import { CURRENT_SCHEMA_VERSION, defaultSettings } from '../types'

/** Ensure pages have order and other required fields after load. */
export function migratePages(pages: Page[]): Page[] {
  const byParent = new Map<string | null, Page[]>()
  for (const p of pages) {
    const parent = p.parentId ?? null
    if (!byParent.has(parent)) byParent.set(parent, [])
    byParent.get(parent)!.push(p)
  }

  const orderMap = new Map<string, number>()
  for (const [, siblings] of byParent) {
    siblings
      .slice()
      .sort((a, b) => {
        const ao = typeof a.order === 'number' ? a.order : a.createdAt
        const bo = typeof b.order === 'number' ? b.order : b.createdAt
        return ao - bo
      })
      .forEach((p, i) => orderMap.set(p.id, i * 1000))
  }

  return pages.map((p) => {
    let database = p.database
    if (database) {
      // ensure calendar view exists if date prop present
      const hasDate = database.properties.some((x) => x.type === 'date')
      const hasCal = database.views.some((v) => v.type === 'calendar')
      if (hasDate && !hasCal) {
        const dateProp = database.properties.find((x) => x.type === 'date')!
        database = {
          ...database,
          views: [
            ...database.views,
            {
              id: `cal-${database.id}`,
              name: '캘린더',
              type: 'calendar',
              datePropId: dateProp.id,
            },
          ],
        }
      }
    }
    return {
      ...p,
      order: orderMap.get(p.id) ?? p.order ?? 0,
      parentId: p.parentId ?? null,
      favorite: !!p.favorite,
      deleted: !!p.deleted,
      blocks: Array.isArray(p.blocks) ? p.blocks : [],
      database,
    }
  })
}

export function migrateSettings(raw: Partial<AppSettings> | undefined): AppSettings {
  const base = defaultSettings()
  if (!raw) return base
  return {
    ...base,
    ...raw,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  }
}
