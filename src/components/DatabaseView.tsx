import { useMemo, useState } from 'react'
import type { Database, DbRow, Page } from '../types'
import { useStore } from '../store'
import { filterAndSortRows, type SortDir, type SortKey } from '../lib/db-query'
import { Plus, Trash2, LayoutGrid, Table2, Columns3, ArrowUpDown, Search } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  page: Page
}

export function DatabaseView({ page }: Props) {
  const db = page.database as Database
  const setDbView = useStore((s) => s.setDbView)
  const addDbRow = useStore((s) => s.addDbRow)
  const updateDbRow = useStore((s) => s.updateDbRow)
  const deleteDbRow = useStore((s) => s.deleteDbRow)
  const addDbProperty = useStore((s) => s.addDbProperty)

  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('none')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [statusFilter, setStatusFilter] = useState('')

  const activeView = db.views.find((v) => v.id === db.activeViewId) ?? db.views[0]
  const statusProp =
    db.properties.find((p) => p.type === 'status') ??
    db.properties.find((p) => p.type === 'select')

  const propFilters = useMemo(() => {
    const f: Record<string, string> = {}
    if (statusFilter && statusProp) f[statusProp.id] = statusFilter
    return f
  }, [statusFilter, statusProp])

  const rows = useMemo(
    () =>
      filterAndSortRows(db, {
        query,
        sortKey,
        sortDir,
        propFilters,
      }),
    [db, query, sortKey, sortDir, propFilters],
  )

  return (
    <div className="mx-auto w-full max-w-6xl px-6 pb-24">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {db.views.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setDbView(page.id, v.id)}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition',
              v.id === activeView.id
                ? 'bg-[var(--color-accent-soft)] font-medium text-[var(--color-accent)]'
                : 'text-[var(--color-muted)] hover:bg-[var(--color-hover)]',
            )}
          >
            {v.type === 'table' && <Table2 size={14} />}
            {v.type === 'board' && <Columns3 size={14} />}
            {v.type === 'gallery' && <LayoutGrid size={14} />}
            {v.name}
          </button>
        ))}
        <div className="flex-1" />
        <button
          type="button"
          className="rounded-lg px-3 py-1.5 text-sm hover:bg-[var(--color-hover)]"
          onClick={() => addDbProperty(page.id, { name: '새 속성', type: 'text' })}
        >
          + 속성
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-white"
          onClick={() => addDbRow(page.id)}
        >
          <Plus size={14} /> 새 행
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-hover)] p-2">
        <div className="flex min-w-[180px] flex-1 items-center gap-2 rounded-lg bg-[var(--color-panel)] px-2 py-1.5">
          <Search size={14} className="text-[var(--color-muted)]" />
          <input
            className="w-full border-none bg-transparent text-sm outline-none"
            placeholder="행 검색…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
          <ArrowUpDown size={12} />
          정렬
          <select
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-2 py-1 text-xs text-[var(--color-text)] outline-none"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
          >
            <option value="none">없음</option>
            <option value="title">이름</option>
            {db.properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <select
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-2 py-1 text-xs outline-none"
          value={sortDir}
          disabled={sortKey === 'none'}
          onChange={(e) => setSortDir(e.target.value as SortDir)}
        >
          <option value="asc">오름차순</option>
          <option value="desc">내림차순</option>
        </select>
        {statusProp && (
          <select
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-2 py-1 text-xs outline-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">모든 {statusProp.name}</option>
            {(statusProp.options ?? []).map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        )}
        <span className="px-1 text-xs text-[var(--color-muted)]">
          {rows.length}/{db.rows.length}
        </span>
      </div>

      {activeView.type === 'board' ? (
        <BoardView page={page} db={db} rows={rows} groupBy={activeView.groupBy} />
      ) : activeView.type === 'gallery' ? (
        <GalleryView page={page} db={db} rows={rows} />
      ) : (
        <TableView
          page={page}
          db={db}
          rows={rows}
          updateDbRow={updateDbRow}
          deleteDbRow={deleteDbRow}
          addDbRow={addDbRow}
        />
      )}
    </div>
  )
}

function TableView({
  page,
  db,
  rows,
  updateDbRow,
  deleteDbRow,
  addDbRow,
}: {
  page: Page
  db: Database
  rows: DbRow[]
  updateDbRow: (
    pageId: string,
    rowId: string,
    values: Record<string, string | number | boolean | string[] | null>,
  ) => void
  deleteDbRow: (pageId: string, rowId: string) => void
  addDbRow: (pageId: string) => void
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
      <table className="db-table">
        <thead>
          <tr>
            <th style={{ minWidth: 220 }}>이름</th>
            {db.properties.map((p) => (
              <th key={p.id}>{p.name}</th>
            ))}
            <th style={{ width: 40 }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <input
                  value={String(row.values.title ?? '')}
                  placeholder="제목 없음"
                  onChange={(e) => updateDbRow(page.id, row.id, { title: e.target.value })}
                />
              </td>
              {db.properties.map((prop) => (
                <td key={prop.id}>
                  {prop.type === 'select' || prop.type === 'status' ? (
                    <select
                      value={String(row.values[prop.id] ?? '')}
                      onChange={(e) => updateDbRow(page.id, row.id, { [prop.id]: e.target.value })}
                    >
                      {(prop.options ?? []).map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  ) : prop.type === 'checkbox' ? (
                    <input
                      type="checkbox"
                      checked={!!row.values[prop.id]}
                      onChange={(e) => updateDbRow(page.id, row.id, { [prop.id]: e.target.checked })}
                    />
                  ) : prop.type === 'date' ? (
                    <input
                      type="date"
                      value={String(row.values[prop.id] ?? '')}
                      onChange={(e) => updateDbRow(page.id, row.id, { [prop.id]: e.target.value })}
                    />
                  ) : prop.type === 'number' ? (
                    <input
                      type="number"
                      value={
                        row.values[prop.id] === null || row.values[prop.id] === undefined
                          ? ''
                          : String(row.values[prop.id])
                      }
                      onChange={(e) =>
                        updateDbRow(page.id, row.id, {
                          [prop.id]: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                    />
                  ) : (
                    <input
                      value={String(row.values[prop.id] ?? '')}
                      onChange={(e) => updateDbRow(page.id, row.id, { [prop.id]: e.target.value })}
                    />
                  )}
                </td>
              ))}
              <td>
                <button type="button" onClick={() => deleteDbRow(page.id, row.id)} title="삭제">
                  <Trash2 size={14} className="text-[var(--color-muted)]" />
                </button>
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={db.properties.length + 2}>
              <button
                type="button"
                className="flex w-full items-center gap-1 py-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]"
                onClick={() => addDbRow(page.id)}
              >
                <Plus size={14} /> 새로 만들기
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function BoardView({
  page,
  db,
  rows,
  groupBy,
}: {
  page: Page
  db: Database
  rows: DbRow[]
  groupBy?: string
}) {
  const updateDbRow = useStore((s) => s.updateDbRow)
  const addDbRow = useStore((s) => s.addDbRow)
  const prop =
    db.properties.find((p) => p.id === groupBy) ??
    db.properties.find((p) => p.type === 'status' || p.type === 'select')
  const columns = prop?.options ?? [{ id: 'none', name: '없음', color: '#64748b' }]

  const grouped = useMemo(() => {
    const map: Record<string, DbRow[]> = {}
    for (const col of columns) map[col.id] = []
    for (const row of rows) {
      const key = String(row.values[prop?.id ?? ''] ?? columns[0]?.id)
      if (!map[key]) map[key] = []
      map[key].push(row)
    }
    return map
  }, [rows, columns, prop])

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {columns.map((col) => (
        <div key={col.id} className="board-col">
          <div className="mb-3 flex items-center gap-2 px-1">
            <span
              className="rounded-md px-2 py-0.5 text-xs font-medium text-white"
              style={{ background: col.color }}
            >
              {col.name}
            </span>
            <span className="text-xs text-[var(--color-muted)]">{grouped[col.id]?.length ?? 0}</span>
          </div>
          {(grouped[col.id] ?? []).map((row) => (
            <div key={row.id} className="board-card">
              <input
                className="w-full border-none bg-transparent font-medium outline-none"
                value={String(row.values.title ?? '')}
                placeholder="제목 없음"
                onChange={(e) => updateDbRow(page.id, row.id, { title: e.target.value })}
              />
              {db.properties
                .filter((p) => p.id !== prop?.id)
                .slice(0, 2)
                .map((p) => (
                  <div key={p.id} className="mt-1 text-xs text-[var(--color-muted)]">
                    {p.name}: {String(row.values[p.id] ?? '—')}
                  </div>
                ))}
            </div>
          ))}
          <button
            type="button"
            className="mt-1 flex w-full items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-[var(--color-muted)] hover:bg-[var(--color-panel)]"
            onClick={() => {
              addDbRow(page.id)
              setTimeout(() => {
                const pages = useStore.getState().pages
                const p = pages.find((x) => x.id === page.id)
                const last = p?.database?.rows.at(-1)
                if (last && prop) {
                  updateDbRow(page.id, last.id, { [prop.id]: col.id })
                }
              }, 0)
            }}
          >
            <Plus size={14} /> 추가
          </button>
        </div>
      ))}
    </div>
  )
}

function GalleryView({ page, db, rows }: { page: Page; db: Database; rows: DbRow[] }) {
  const updateDbRow = useStore((s) => s.updateDbRow)
  const addDbRow = useStore((s) => s.addDbRow)

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row) => (
        <div key={row.id} className="bento-card !p-4">
          <div
            className="mb-3 h-24 rounded-xl"
            style={{
              background: `linear-gradient(135deg, hsl(${(row.id.charCodeAt(0) * 40) % 360} 70% 70%), hsl(${(row.id.charCodeAt(1) * 50) % 360} 60% 55%))`,
            }}
          />
          <input
            className="w-full border-none bg-transparent text-base font-semibold outline-none"
            value={String(row.values.title ?? '')}
            placeholder="제목 없음"
            onChange={(e) => updateDbRow(page.id, row.id, { title: e.target.value })}
          />
          <div className="mt-2 space-y-1 text-xs text-[var(--color-muted)]">
            {db.properties.slice(0, 3).map((p) => (
              <div key={p.id}>
                {p.name}: {String(row.values[p.id] ?? '—')}
              </div>
            ))}
          </div>
        </div>
      ))}
      <button
        type="button"
        className="bento-card flex min-h-[180px] items-center justify-center gap-2 text-[var(--color-muted)]"
        onClick={() => addDbRow(page.id)}
      >
        <Plus size={18} /> 새 카드
      </button>
    </div>
  )
}
