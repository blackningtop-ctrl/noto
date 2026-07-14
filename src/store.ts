import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { temporal } from 'zundo'
import type {
  AppSettings,
  Block,
  BlockType,
  Database,
  DbRow,
  Page,
  PageVersion,
  Property,
  Snippet,
  View,
} from './types'
import { defaultApiEndpoint, defaultGitMeta, defaultSettings, defaultTableData } from './types'
import { createSeedPages } from './lib/seed'
import { uid } from './lib/id'
import { getTemplate } from './lib/templates'
import { createDefaultSnippets } from './lib/snippets'
import { createIdbStorage } from './lib/idb-storage'
import { migratePages, migrateSettings } from './lib/migrate'

const MAX_VERSIONS_PER_PAGE = 20
const AUTO_SNAPSHOT_MS = 30_000
const lastAutoSnapshot: Record<string, number> = {}

interface AppState {
  pages: Page[]
  snippets: Snippet[]
  versions: PageVersion[]
  settings: AppSettings
  view: View
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  searchQuery: string
  commandPaletteOpen: boolean
  setView: (view: View) => void
  setSidebarOpen: (open: boolean) => void
  toggleTheme: () => void
  setSearchQuery: (q: string) => void
  setCommandPaletteOpen: (open: boolean) => void
  updateSettings: (patch: Partial<AppSettings>) => void
  purgeExpiredTrash: () => void
  markBackupNow: () => void

  createPage: (opts?: {
    parentId?: string | null
    type?: Page['type']
    title?: string
    icon?: string
    blocks?: Block[]
    database?: Database
    cover?: string
  }) => string
  createFromTemplate: (templateId: string) => string | null
  updatePage: (id: string, patch: Partial<Page>) => void
  deletePage: (id: string) => void
  restorePage: (id: string) => void
  permanentlyDelete: (id: string) => void
  emptyTrash: () => void
  toggleFavorite: (id: string) => void
  movePage: (id: string, parentId: string | null) => void
  reorderPage: (id: string, targetId: string, position: 'before' | 'after' | 'inside') => void
  duplicatePage: (id: string) => string | null

  setBlocks: (pageId: string, blocks: Block[]) => void
  updateBlock: (pageId: string, blockId: string, patch: Partial<Block>) => void
  addBlock: (pageId: string, afterId: string | null, type?: BlockType, content?: string) => string
  removeBlock: (pageId: string, blockId: string) => void
  changeBlockType: (pageId: string, blockId: string, type: BlockType) => void
  moveBlock: (pageId: string, fromIndex: number, toIndex: number) => void

  updateDatabase: (pageId: string, updater: (db: Database) => Database) => void
  addDbRow: (pageId: string) => void
  updateDbRow: (pageId: string, rowId: string, values: DbRow['values']) => void
  deleteDbRow: (pageId: string, rowId: string) => void
  addDbProperty: (pageId: string, prop: Omit<Property, 'id'>) => void
  setDbView: (pageId: string, viewId: string) => void

  addSnippet: (data: Omit<Snippet, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateSnippet: (id: string, patch: Partial<Snippet>) => void
  deleteSnippet: (id: string) => void
  insertSnippetOnPage: (pageId: string, snippetId: string, afterBlockId?: string | null) => void

  saveVersion: (pageId: string, label?: string, auto?: boolean) => void
  restoreVersion: (versionId: string) => void
  deleteVersion: (versionId: string) => void

  exportData: () => string
  importData: (json: string) => boolean
  importWorkspacePages: (
    pages: Page[],
    snippets?: Snippet[],
    mode?: 'replace' | 'merge',
  ) => void
  resetWorkspace: () => void
}

function pruneVersions(versions: PageVersion[], pageId: string): PageVersion[] {
  const forPage = versions
    .filter((v) => v.pageId === pageId)
    .sort((a, b) => b.createdAt - a.createdAt)
  if (forPage.length <= MAX_VERSIONS_PER_PAGE) return versions
  const keep = new Set(forPage.slice(0, MAX_VERSIONS_PER_PAGE).map((v) => v.id))
  return versions.filter((v) => v.pageId !== pageId || keep.has(v.id))
}

function touch(page: Page): Page {
  return { ...page, updatedAt: Date.now() }
}

function emptyBlocks(): Block[] {
  return [{ id: uid(), type: 'paragraph', content: '' }]
}

function emptyDatabase(): Database {
  const statusId = uid()
  const dateId = uid()
  const options = [
    { id: uid(), name: '할 일', color: '#64748b' },
    { id: uid(), name: '진행 중', color: '#3b82f6' },
    { id: uid(), name: '완료', color: '#22c55e' },
  ]
  const tableId = uid()
  const boardId = uid()
  const calId = uid()
  return {
    id: uid(),
    properties: [
      { id: statusId, name: '상태', type: 'status', options },
      { id: dateId, name: '날짜', type: 'date' },
    ],
    rows: [],
    views: [
      { id: tableId, name: '테이블', type: 'table' },
      { id: boardId, name: '보드', type: 'board', groupBy: statusId },
      { id: calId, name: '캘린더', type: 'calendar', datePropId: dateId },
    ],
    activeViewId: tableId,
  }
}

function nextOrder(pages: Page[], parentId: string | null): number {
  const siblings = pages.filter((p) => !p.deleted && p.parentId === parentId)
  if (siblings.length === 0) return 0
  return Math.max(...siblings.map((p) => p.order ?? 0)) + 1000
}

export const useStore = create<AppState>()(
  persist(
    temporal(
    (set, get) => ({
      pages: migratePages(createSeedPages()),
      snippets: createDefaultSnippets(),
      versions: [],
      settings: defaultSettings(),
      view: { kind: 'home' },
      sidebarOpen: true,
      theme: 'light',
      searchQuery: '',
      commandPaletteOpen: false,

      setView: (view) => set({ view }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      toggleTheme: () =>
        set((s) => {
          const theme = s.theme === 'light' ? 'dark' : 'light'
          document.documentElement.classList.toggle('dark', theme === 'dark')
          return { theme }
        }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),
      markBackupNow: () =>
        set((s) => ({
          settings: { ...s.settings, lastBackupAt: Date.now() },
        })),
      purgeExpiredTrash: () => {
        const days = get().settings.trashRetentionDays
        if (days <= 0) return
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
        set((s) => ({
          pages: s.pages.filter(
            (p) => !p.deleted || !p.deletedAt || p.deletedAt > cutoff,
          ),
        }))
      },

      createPage: (opts = {}) => {
        const id = uid()
        const type = opts.type ?? 'page'
        const parentId = opts.parentId ?? null
        const page: Page = {
          id,
          title: opts.title ?? (type === 'database' ? '새 데이터베이스' : '제목 없음'),
          icon: opts.icon ?? (type === 'database' ? '📊' : '📄'),
          parentId,
          order: nextOrder(get().pages, parentId),
          type,
          blocks: opts.blocks ?? (type === 'page' ? emptyBlocks() : []),
          database: opts.database ?? (type === 'database' ? emptyDatabase() : undefined),
          cover: opts.cover,
          favorite: false,
          deleted: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        set((s) => ({
          pages: [...s.pages, page],
          view: { kind: 'page', pageId: id },
          commandPaletteOpen: false,
        }))
        return id
      },

      createFromTemplate: (templateId) => {
        const tpl = getTemplate(templateId)
        if (!tpl) return null
        const built = tpl.build()
        return get().createPage({
          title: built.title,
          icon: built.icon,
          type: built.type,
          blocks: built.blocks,
          database: built.database,
          cover: built.cover,
        })
      },

      updatePage: (id, patch) => {
        set((s) => ({
          pages: s.pages.map((p) => (p.id === id ? touch({ ...p, ...patch }) : p)),
        }))
        get().saveVersion(id, 'auto', true)
      },

      deletePage: (id) => {
        const mark = (pages: Page[], target: string): Page[] =>
          pages.map((p) => {
            if (p.id === target || p.parentId === target) {
              const kids = pages.filter((c) => c.parentId === p.id)
              let result = pages.map((x) =>
                x.id === p.id || x.parentId === p.id
                  ? { ...x, deleted: true, deletedAt: Date.now(), favorite: false }
                  : x,
              )
              for (const k of kids) result = mark(result, k.id)
              return result.find((x) => x.id === p.id)!
            }
            return p
          })

        set((s) => {
          const collect = new Set<string>()
          const walk = (pid: string) => {
            collect.add(pid)
            s.pages.filter((p) => p.parentId === pid).forEach((c) => walk(c.id))
          }
          walk(id)
          const pages = s.pages.map((p) =>
            collect.has(p.id)
              ? { ...p, deleted: true, deletedAt: Date.now(), favorite: false }
              : p,
          )
          const view =
            s.view.kind === 'page' && collect.has(s.view.pageId)
              ? ({ kind: 'home' } as View)
              : s.view
          return { pages, view }
        })
      },

      restorePage: (id) =>
        set((s) => ({
          pages: s.pages.map((p) =>
            p.id === id ? { ...p, deleted: false, deletedAt: undefined } : p,
          ),
        })),

      permanentlyDelete: (id) =>
        set((s) => {
          const collect = new Set<string>()
          const walk = (pid: string) => {
            collect.add(pid)
            s.pages.filter((p) => p.parentId === pid).forEach((c) => walk(c.id))
          }
          walk(id)
          return { pages: s.pages.filter((p) => !collect.has(p.id)) }
        }),

      emptyTrash: () => set((s) => ({ pages: s.pages.filter((p) => !p.deleted) })),

      toggleFavorite: (id) =>
        set((s) => ({
          pages: s.pages.map((p) =>
            p.id === id ? { ...p, favorite: !p.favorite } : p,
          ),
        })),

      movePage: (id, parentId) =>
        set((s) => ({
          pages: s.pages.map((p) =>
            p.id === id
              ? touch({ ...p, parentId, order: nextOrder(s.pages, parentId) })
              : p,
          ),
        })),

      reorderPage: (id, targetId, position) => {
        if (id === targetId) return
        const pages = get().pages
        const moving = pages.find((p) => p.id === id)
        const target = pages.find((p) => p.id === targetId)
        if (!moving || !target || moving.deleted || target.deleted) return

        // prevent nesting under self/descendant
        const isDescendant = (pid: string, ancestor: string): boolean => {
          let cur: string | null | undefined = pid
          const map = new Map(pages.map((p) => [p.id, p.parentId]))
          while (cur) {
            if (cur === ancestor) return true
            cur = map.get(cur) ?? null
          }
          return false
        }

        if (position === 'inside') {
          if (isDescendant(targetId, id)) return
          set((s) => ({
            pages: s.pages.map((p) =>
              p.id === id
                ? touch({
                    ...p,
                    parentId: targetId,
                    order: nextOrder(s.pages, targetId),
                  })
                : p,
            ),
          }))
          return
        }

        const parentId = target.parentId
        if (isDescendant(targetId, id) && parentId === id) return
        const siblings = pages
          .filter((p) => !p.deleted && p.parentId === parentId && p.id !== id)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        const tIdx = siblings.findIndex((p) => p.id === targetId)
        if (tIdx < 0) return
        const insertAt = position === 'before' ? tIdx : tIdx + 1
        siblings.splice(insertAt, 0, { ...moving, parentId })
        const orderMap = new Map(siblings.map((p, i) => [p.id, i * 1000]))
        set((s) => ({
          pages: s.pages.map((p) => {
            if (p.id === id) {
              return touch({ ...p, parentId, order: orderMap.get(id) ?? 0 })
            }
            if (orderMap.has(p.id)) {
              return { ...p, order: orderMap.get(p.id)! }
            }
            return p
          }),
        }))
      },

      duplicatePage: (id) => {
        const src = get().pages.find((p) => p.id === id)
        if (!src) return null
        const newId = uid()
        const copy: Page = {
          ...structuredClone(src),
          id: newId,
          title: `${src.title} (복사본)`,
          favorite: false,
          order: nextOrder(get().pages, src.parentId),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        set((s) => ({ pages: [...s.pages, copy], view: { kind: 'page', pageId: newId } }))
        return newId
      },

      setBlocks: (pageId, blocks) => {
        set((s) => ({
          pages: s.pages.map((p) => (p.id === pageId ? touch({ ...p, blocks }) : p)),
        }))
        get().saveVersion(pageId, 'auto', true)
      },

      updateBlock: (pageId, blockId, patch) => {
        set((s) => ({
          pages: s.pages.map((p) => {
            if (p.id !== pageId) return p
            return touch({
              ...p,
              blocks: p.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)),
            })
          }),
        }))
        get().saveVersion(pageId, 'auto', true)
      },

      addBlock: (pageId, afterId, type = 'paragraph', content = '') => {
        const newId = uid()
        const newBlock: Block = { id: newId, type, content }
        if (type === 'todo') newBlock.checked = false
        if (type === 'toggle') {
          newBlock.open = true
          newBlock.children = []
        }
        if (type === 'code') {
          newBlock.language = 'typescript'
          if (!content) newBlock.content = ''
        }
        if (type === 'mermaid' && !content) {
          newBlock.content = 'flowchart LR\n  A[Start] --> B[Done]'
        }
        if (type === 'api') {
          newBlock.api = defaultApiEndpoint()
          newBlock.content = 'API'
        }
        if (type === 'git') {
          newBlock.git = defaultGitMeta()
          newBlock.content = 'Git'
        }
        if (type === 'table') {
          newBlock.table = defaultTableData()
          newBlock.content = 'table'
        }
        set((s) => ({
          pages: s.pages.map((p) => {
            if (p.id !== pageId) return p
            const blocks = [...p.blocks]
            if (!afterId) {
              blocks.push(newBlock)
            } else {
              const idx = blocks.findIndex((b) => b.id === afterId)
              blocks.splice(idx + 1, 0, newBlock)
            }
            return touch({ ...p, blocks })
          }),
        }))
        get().saveVersion(pageId, 'auto', true)
        return newId
      },

      removeBlock: (pageId, blockId) =>
        set((s) => ({
          pages: s.pages.map((p) => {
            if (p.id !== pageId) return p
            let blocks = p.blocks.filter((b) => b.id !== blockId)
            if (blocks.length === 0) blocks = emptyBlocks()
            return touch({ ...p, blocks })
          }),
        })),

      changeBlockType: (pageId, blockId, type) =>
        set((s) => ({
          pages: s.pages.map((p) => {
            if (p.id !== pageId) return p
            return touch({
              ...p,
              blocks: p.blocks.map((b) => {
                if (b.id !== blockId) return b
                const next: Block = { ...b, type }
                if (type === 'todo' && next.checked === undefined) next.checked = false
                if (type === 'toggle') {
                  next.open = next.open ?? true
                  next.children = next.children ?? []
                }
                if (type === 'code') {
                  next.language = next.language ?? 'typescript'
                }
                if (type === 'mermaid' && !next.content) {
                  next.content = 'flowchart LR\n  A[Start] --> B[Done]'
                }
                if (type === 'api') {
                  next.api = next.api ?? defaultApiEndpoint()
                  next.content = next.content || 'API'
                }
                if (type === 'git') {
                  next.git = next.git ?? defaultGitMeta()
                  next.content = next.content || 'Git'
                }
                if (type === 'table') {
                  next.table = next.table ?? defaultTableData()
                  next.content = next.content || 'table'
                }
                return next
              }),
            })
          }),
        })),

      moveBlock: (pageId, fromIndex, toIndex) =>
        set((s) => ({
          pages: s.pages.map((p) => {
            if (p.id !== pageId) return p
            const blocks = [...p.blocks]
            const [item] = blocks.splice(fromIndex, 1)
            blocks.splice(toIndex, 0, item)
            return touch({ ...p, blocks })
          }),
        })),

      updateDatabase: (pageId, updater) =>
        set((s) => ({
          pages: s.pages.map((p) => {
            if (p.id !== pageId || !p.database) return p
            return touch({ ...p, database: updater(p.database) })
          }),
        })),

      addDbRow: (pageId) => {
        const page = get().pages.find((p) => p.id === pageId)
        if (!page?.database) return
        const row: DbRow = {
          id: uid(),
          values: { title: '' },
        }
        for (const prop of page.database.properties) {
          if (prop.type === 'checkbox') row.values[prop.id] = false
          else if (prop.type === 'multi_select') row.values[prop.id] = []
          else if (prop.type === 'number') row.values[prop.id] = null
          else if (prop.type === 'status' || prop.type === 'select') {
            row.values[prop.id] = prop.options?.[0]?.id ?? null
          } else row.values[prop.id] = ''
        }
        get().updateDatabase(pageId, (db) => ({ ...db, rows: [...db.rows, row] }))
      },

      updateDbRow: (pageId, rowId, values) =>
        get().updateDatabase(pageId, (db) => ({
          ...db,
          rows: db.rows.map((r) =>
            r.id === rowId ? { ...r, values: { ...r.values, ...values } } : r,
          ),
        })),

      deleteDbRow: (pageId, rowId) =>
        get().updateDatabase(pageId, (db) => ({
          ...db,
          rows: db.rows.filter((r) => r.id !== rowId),
        })),

      addDbProperty: (pageId, prop) =>
        get().updateDatabase(pageId, (db) => {
          const id = uid()
          const property: Property = { ...prop, id }
          return {
            ...db,
            properties: [...db.properties, property],
            rows: db.rows.map((r) => ({
              ...r,
              values: {
                ...r.values,
                [id]:
                  prop.type === 'checkbox'
                    ? false
                    : prop.type === 'multi_select'
                      ? []
                      : prop.type === 'number'
                        ? null
                        : '',
              },
            })),
          }
        }),

      setDbView: (pageId, viewId) =>
        get().updateDatabase(pageId, (db) => ({ ...db, activeViewId: viewId })),

      addSnippet: (data) => {
        const id = uid()
        const now = Date.now()
        const snippet: Snippet = { ...data, id, createdAt: now, updatedAt: now }
        set((s) => ({ snippets: [snippet, ...s.snippets] }))
        return id
      },

      updateSnippet: (id, patch) =>
        set((s) => ({
          snippets: s.snippets.map((sn) =>
            sn.id === id ? { ...sn, ...patch, updatedAt: Date.now() } : sn,
          ),
        })),

      deleteSnippet: (id) =>
        set((s) => ({ snippets: s.snippets.filter((sn) => sn.id !== id) })),

      insertSnippetOnPage: (pageId, snippetId, afterBlockId = null) => {
        const sn = get().snippets.find((s) => s.id === snippetId)
        if (!sn) return
        const page = get().pages.find((p) => p.id === pageId)
        if (!page || page.type !== 'page') return
        const after =
          afterBlockId ?? page.blocks[page.blocks.length - 1]?.id ?? null
        const newId = uid()
        const isMd = sn.language === 'markdown'
        const block: Block = isMd
          ? { id: newId, type: 'paragraph', content: sn.body }
          : {
              id: newId,
              type: 'code',
              content: sn.body,
              language: sn.language === 'dockerfile' ? 'bash' : sn.language,
            }
        set((s) => ({
          pages: s.pages.map((p) => {
            if (p.id !== pageId) return p
            const blocks = [...p.blocks]
            if (!after) blocks.push(block)
            else {
              const idx = blocks.findIndex((b) => b.id === after)
              blocks.splice(idx + 1, 0, block)
            }
            return touch({ ...p, blocks })
          }),
        }))
        get().saveVersion(pageId, 'auto', true)
      },

      saveVersion: (pageId, label, auto = false) => {
        const page = get().pages.find((p) => p.id === pageId)
        if (!page || page.deleted) return
        if (auto) {
          const last = lastAutoSnapshot[pageId] ?? 0
          if (Date.now() - last < AUTO_SNAPSHOT_MS) return
          lastAutoSnapshot[pageId] = Date.now()
        }
        const version: PageVersion = {
          id: uid(),
          pageId,
          title: page.title,
          icon: page.icon,
          blocks: structuredClone(page.blocks),
          database: page.database ? structuredClone(page.database) : undefined,
          createdAt: Date.now(),
          label: label || (auto ? '자동 저장' : '수동 스냅샷'),
          auto,
        }
        set((s) => ({
          versions: pruneVersions([version, ...s.versions], pageId),
        }))
      },

      restoreVersion: (versionId) => {
        const version = get().versions.find((v) => v.id === versionId)
        if (!version) return
        // snapshot current before restore
        get().saveVersion(version.pageId, '복원 전 백업', false)
        set((s) => ({
          pages: s.pages.map((p) =>
            p.id === version.pageId
              ? touch({
                  ...p,
                  title: version.title,
                  icon: version.icon,
                  blocks: structuredClone(version.blocks),
                  database: version.database
                    ? structuredClone(version.database)
                    : p.database,
                })
              : p,
          ),
          view: { kind: 'page', pageId: version.pageId },
        }))
      },

      deleteVersion: (versionId) =>
        set((s) => ({ versions: s.versions.filter((v) => v.id !== versionId) })),

      exportData: () =>
        JSON.stringify(
          {
            version: 2,
            exportedAt: new Date().toISOString(),
            pages: get().pages,
            snippets: get().snippets,
            versions: get().versions,
          },
          null,
          2,
        ),

      importData: (json) => {
        try {
          const data = JSON.parse(json)
          if (!Array.isArray(data.pages)) return false
          set({
            pages: data.pages,
            snippets: Array.isArray(data.snippets) ? data.snippets : get().snippets,
            versions: Array.isArray(data.versions) ? data.versions : [],
            view: { kind: 'home' },
          })
          return true
        } catch {
          return false
        }
      },

      importWorkspacePages: (pages, snippets, mode = 'replace') => {
        if (!Array.isArray(pages) || pages.length === 0) return
        const migrated = migratePages(pages)
        if (mode === 'replace') {
          set({
            pages: migrated,
            snippets: snippets ?? get().snippets,
            versions: [],
            view: { kind: 'home' },
          })
          return
        }
        const byId = new Map(get().pages.map((p) => [p.id, p]))
        for (const p of migrated) {
          byId.set(p.id, { ...p, deleted: false, deletedAt: undefined })
        }
        const mergedSnippets = snippets?.length
          ? (() => {
              const map = new Map(get().snippets.map((s) => [s.id, s]))
              for (const s of snippets) map.set(s.id, s)
              return [...map.values()]
            })()
          : get().snippets
        set({
          pages: migratePages([...byId.values()]),
          snippets: mergedSnippets,
          view: { kind: 'home' },
        })
      },

      resetWorkspace: () =>
        set({
          pages: migratePages(createSeedPages()),
          snippets: createDefaultSnippets(),
          versions: [],
          settings: defaultSettings(),
          view: { kind: 'home' },
        }),
    }),
    {
      limit: 40,
      partialize: (s) => {
        const { pages, snippets } = s
        return { pages, snippets } as AppState
      },
      equality: (a, b) =>
        a.pages === b.pages && a.snippets === b.snippets,
    },
    ),
    {
      name: 'noto-workspace-v1',
      storage: createIdbStorage(),
      partialize: (s) => ({
        pages: s.pages,
        snippets: s.snippets,
        versions: s.versions,
        settings: s.settings,
        theme: s.theme,
        sidebarOpen: s.sidebarOpen,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>
        return {
          ...current,
          ...p,
          snippets:
            Array.isArray(p.snippets) && p.snippets.length > 0
              ? p.snippets
              : current.snippets,
          versions: Array.isArray(p.versions) ? p.versions : [],
          pages: migratePages(Array.isArray(p.pages) ? p.pages : current.pages),
          settings: migrateSettings(p.settings),
        }
      },
      onRehydrateStorage: () => (state) => {
        if (state?.theme === 'dark') {
          document.documentElement.classList.add('dark')
        }
        // purge expired trash after load
        window.setTimeout(() => {
          try {
            useStore.getState().purgeExpiredTrash()
          } catch {
            /* ignore */
          }
        }, 0)
      },
    },
  ),
)

export function undoWorkspace() {
  useStore.temporal.getState().undo()
}

export function redoWorkspace() {
  useStore.temporal.getState().redo()
}

/** Avoid filtering inside useStore selectors — new arrays break React getSnapshot. */
export function useActivePages() {
  const pages = useStore((s) => s.pages)
  return useMemo(() => pages.filter((p) => !p.deleted), [pages])
}

export function useDeletedPages() {
  const pages = useStore((s) => s.pages)
  return useMemo(() => pages.filter((p) => p.deleted), [pages])
}

export function usePage(id: string | undefined) {
  const pages = useStore((s) => s.pages)
  return useMemo(() => (id ? pages.find((p) => p.id === id) : undefined), [pages, id])
}
