import { useMemo, useState } from 'react'
import type { Database, DbRow, Page, Property } from '../types'
import { useStore, useActivePages } from '../store'
import { filterAndSortRows, type SortDir, type SortKey } from '../lib/db-query'
import { evalFormula } from '../lib/formula'
import {
  Plus,
  Trash2,
  LayoutGrid,
  Table2,
  Columns3,
  ArrowUpDown,
  Search,
  CalendarDays,
} from 'lucide-react'
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
            {v.type === 'calendar' && <CalendarDays size={14} />}
            {v.name}
          </button>
        ))}
        <div className="flex-1" />
        <select
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-2 py-1.5 text-xs outline-none"
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value as Property['type'] | ''
            if (!v) return
            if (v === 'formula') {
              addDbProperty(page.id, {
                name: '수식',
                type: 'formula',
                formula: 'prop("Points")',
              })
            } else if (v === 'relation') {
              addDbProperty(page.id, { name: '관련 페이지', type: 'relation' })
            } else {
              addDbProperty(page.id, { name: '새 속성', type: v })
            }
            e.target.value = ''
          }}
        >
          <option value="">+ 속성 추가</option>
          <option value="text">텍스트</option>
          <option value="number">숫자</option>
          <option value="date">날짜</option>
          <option value="select">선택</option>
          <option value="status">상태</option>
          <option value="checkbox">체크박스</option>
          <option value="url">URL</option>
          <option value="relation">관계 (페이지)</option>
          <option value="formula">수식</option>
        </select>
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
      ) : activeView.type === 'calendar' ? (
        <CalendarView
          page={page}
          db={db}
          rows={rows}
          datePropId={
            activeView.datePropId ??
            db.properties.find((p) => p.type === 'date')?.id
          }
        />
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
                  <CellEditor
                    prop={prop}
                    row={row}
                    pageId={page.id}
                    properties={db.properties}
                    updateDbRow={updateDbRow}
                  />
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

function CellEditor({
  prop,
  row,
  pageId,
  properties,
  updateDbRow,
}: {
  prop: Property
  row: DbRow
  pageId: string
  properties: Property[]
  updateDbRow: (
    pageId: string,
    rowId: string,
    values: Record<string, string | number | boolean | string[] | null>,
  ) => void
}) {
  const pages = useActivePages()
  const setView = useStore((s) => s.setView)

  if (prop.type === 'formula') {
    const v = evalFormula(prop.formula, row, properties)
    return <span className="text-sm tabular-nums text-[var(--color-muted)]">{v ?? '—'}</span>
  }

  if (prop.type === 'relation') {
    const val = String(row.values[prop.id] ?? '')
    return (
      <div className="flex items-center gap-1">
        <select
          value={val}
          onChange={(e) => updateDbRow(pageId, row.id, { [prop.id]: e.target.value || null })}
        >
          <option value="">—</option>
          {pages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.icon} {p.title || '제목 없음'}
            </option>
          ))}
        </select>
        {val && (
          <button
            type="button"
            className="text-xs text-[var(--color-accent)]"
            onClick={() => setView({ kind: 'page', pageId: val })}
          >
            열기
          </button>
        )}
      </div>
    )
  }

  if (prop.type === 'select' || prop.type === 'status') {
    return (
      <select
        value={String(row.values[prop.id] ?? '')}
        onChange={(e) => updateDbRow(pageId, row.id, { [prop.id]: e.target.value })}
      >
        {(prop.options ?? []).map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    )
  }
  if (prop.type === 'checkbox') {
    return (
      <input
        type="checkbox"
        checked={!!row.values[prop.id]}
        onChange={(e) => updateDbRow(pageId, row.id, { [prop.id]: e.target.checked })}
      />
    )
  }
  if (prop.type === 'date') {
    return (
      <input
        type="date"
        value={String(row.values[prop.id] ?? '')}
        onChange={(e) => updateDbRow(pageId, row.id, { [prop.id]: e.target.value })}
      />
    )
  }
  if (prop.type === 'number') {
    return (
      <input
        type="number"
        value={
          row.values[prop.id] === null || row.values[prop.id] === undefined
            ? ''
            : String(row.values[prop.id])
        }
        onChange={(e) =>
          updateDbRow(pageId, row.id, {
            [prop.id]: e.target.value === '' ? null : Number(e.target.value),
          })
        }
      />
    )
  }
  return (
    <input
      value={String(row.values[prop.id] ?? '')}
      onChange={(e) => updateDbRow(pageId, row.id, { [prop.id]: e.target.value })}
    />
  )
}

function CalendarView({
  page,
  rows,
  datePropId,
}: {
  page: Page
  db: Database
  rows: DbRow[]
  datePropId?: string
}) {
  const [cursor, setCursor] = useState(() => {
    const n = new Date()
    return new Date(n.getFullYear(), n.getMonth(), 1)
  })

  const byDate = useMemo(() => {
    const map: Record<string, DbRow[]> = {}
    if (!datePropId) return map
    for (const r of rows) {
      const key = String(r.values[datePropId] ?? '')
      if (!key) continue
      if (!map[key]) map[key] = []
      map[key].push(r)
    }
    return map
  }, [rows, datePropId])

  if (!datePropId) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-border)] py-12 text-center text-sm text-[var(--color-muted)]">
        날짜 속성이 필요합니다. 속성을 추가하세요.
      </div>
    )
  }

  const y = cursor.getFullYear()
  const m = cursor.getMonth()
  const firstDow = new Date(y, m, 1).getDay()
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const cells: Array<{ day: number | null; dateStr: string | null }> = []
  for (let i = 0; i < firstDow; i++) cells.push({ day: null, dateStr: null })
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, dateStr })
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          className="rounded-lg px-2 py-1 text-sm hover:bg-[var(--color-hover)]"
          onClick={() => setCursor(new Date(y, m - 1, 1))}
        >
          ‹
        </button>
        <span className="font-medium">
          {y}년 {m + 1}월
        </span>
        <button
          type="button"
          className="rounded-lg px-2 py-1 text-sm hover:bg-[var(--color-hover)]"
          onClick={() => setCursor(new Date(y, m + 1, 1))}
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-[var(--color-muted)]">
        {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => (
          <div
            key={i}
            className="min-h-[88px] rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] p-1"
          >
            {c.day && (
              <>
                <div className="mb-1 text-xs font-medium">{c.day}</div>
                <div className="space-y-0.5">
                  {(byDate[c.dateStr!] ?? []).map((r) => (
                    <div
                      key={r.id}
                      className="truncate rounded bg-[var(--color-accent-soft)] px-1 py-0.5 text-[10px]"
                      title={String(r.values.title ?? '')}
                    >
                      {String(r.values.title ?? '제목 없음')}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-[var(--color-muted)]">
        테이블 뷰에서 날짜를 편집하면 「{page.title || '이 DB'}」 캘린더에 반영됩니다.
      </p>
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
