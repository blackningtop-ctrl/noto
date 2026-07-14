import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Block, BlockType, Database, DbRow, Page, Property, View } from './types'
import { createSeedPages } from './lib/seed'
import { uid } from './lib/id'
import { getTemplate } from './lib/templates'

interface AppState {
  pages: Page[]
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

  exportData: () => string
  importData: (json: string) => boolean
  resetWorkspace: () => void
}

function touch(page: Page): Page {
  return { ...page, updatedAt: Date.now() }
}

function emptyBlocks(): Block[] {
  return [{ id: uid(), type: 'paragraph', content: '' }]
}

function emptyDatabase(): Database {
  const statusId = uid()
  const options = [
    { id: uid(), name: '할 일', color: '#64748b' },
    { id: uid(), name: '진행 중', color: '#3b82f6' },
    { id: uid(), name: '완료', color: '#22c55e' },
  ]
  const tableId = uid()
  const boardId = uid()
  return {
    id: uid(),
    properties: [
      { id: statusId, name: '상태', type: 'status', options },
    ],
    rows: [],
    views: [
      { id: tableId, name: '테이블', type: 'table' },
      { id: boardId, name: '보드', type: 'board', groupBy: statusId },
    ],
    activeViewId: tableId,
  }
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      pages: createSeedPages(),
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

      createPage: (opts = {}) => {
        const id = uid()
        const type = opts.type ?? 'page'
        const page: Page = {
          id,
          title: opts.title ?? (type === 'database' ? '새 데이터베이스' : '제목 없음'),
          icon: opts.icon ?? (type === 'database' ? '📊' : '📄'),
          parentId: opts.parentId ?? null,
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

      updatePage: (id, patch) =>
        set((s) => ({
          pages: s.pages.map((p) => (p.id === id ? touch({ ...p, ...patch }) : p)),
        })),

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
            p.id === id ? touch({ ...p, parentId }) : p,
          ),
        })),

      duplicatePage: (id) => {
        const src = get().pages.find((p) => p.id === id)
        if (!src) return null
        const newId = uid()
        const copy: Page = {
          ...structuredClone(src),
          id: newId,
          title: `${src.title} (복사본)`,
          favorite: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        set((s) => ({ pages: [...s.pages, copy], view: { kind: 'page', pageId: newId } }))
        return newId
      },

      setBlocks: (pageId, blocks) =>
        set((s) => ({
          pages: s.pages.map((p) => (p.id === pageId ? touch({ ...p, blocks }) : p)),
        })),

      updateBlock: (pageId, blockId, patch) =>
        set((s) => ({
          pages: s.pages.map((p) => {
            if (p.id !== pageId) return p
            return touch({
              ...p,
              blocks: p.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)),
            })
          }),
        })),

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

      exportData: () =>
        JSON.stringify(
          { version: 1, exportedAt: new Date().toISOString(), pages: get().pages },
          null,
          2,
        ),

      importData: (json) => {
        try {
          const data = JSON.parse(json)
          if (!Array.isArray(data.pages)) return false
          set({ pages: data.pages, view: { kind: 'home' } })
          return true
        } catch {
          return false
        }
      },

      resetWorkspace: () =>
        set({ pages: createSeedPages(), view: { kind: 'home' } }),
    }),
    {
      name: 'noto-workspace-v1',
      partialize: (s) => ({
        pages: s.pages,
        theme: s.theme,
        sidebarOpen: s.sidebarOpen,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme === 'dark') {
          document.documentElement.classList.add('dark')
        }
      },
    },
  ),
)

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
