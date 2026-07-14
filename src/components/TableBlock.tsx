import type { TableData } from '../types'
import { Plus, Trash2 } from 'lucide-react'

interface Props {
  table: TableData
  onChange: (table: TableData) => void
}

export function TableBlock({ table, onChange }: Props) {
  const setCell = (r: number, c: number, value: string) => {
    const rows = table.rows.map((row, ri) =>
      ri === r ? row.map((cell, ci) => (ci === c ? value : cell)) : row,
    )
    onChange({ ...table, rows })
  }

  const addRow = () => {
    const cols = table.rows[0]?.length ?? 2
    onChange({ ...table, rows: [...table.rows, Array.from({ length: cols }, () => '')] })
  }

  const addCol = () => {
    onChange({
      ...table,
      rows: table.rows.map((row) => [...row, '']),
    })
  }

  const removeRow = (r: number) => {
    if (table.rows.length <= 1) return
    onChange({ ...table, rows: table.rows.filter((_, i) => i !== r) })
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-[var(--color-border)]">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-hover)] px-2 py-1.5 text-xs text-[var(--color-muted)]">
        <label className="inline-flex items-center gap-1">
          <input
            type="checkbox"
            checked={table.hasHeader}
            onChange={(e) => onChange({ ...table, hasHeader: e.target.checked })}
          />
          헤더 행
        </label>
        <button type="button" className="rounded px-2 py-0.5 hover:bg-[var(--color-panel)]" onClick={addRow}>
          <Plus size={12} className="inline" /> 행
        </button>
        <button type="button" className="rounded px-2 py-0.5 hover:bg-[var(--color-panel)]" onClick={addCol}>
          <Plus size={12} className="inline" /> 열
        </button>
      </div>
      <table className="db-table">
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => {
                const Tag = table.hasHeader && ri === 0 ? 'th' : 'td'
                return (
                  <Tag key={ci}>
                    <input
                      value={cell}
                      onChange={(e) => setCell(ri, ci, e.target.value)}
                      className={table.hasHeader && ri === 0 ? 'font-semibold' : ''}
                    />
                  </Tag>
                )
              })}
              <td style={{ width: 36 }}>
                <button type="button" onClick={() => removeRow(ri)} title="행 삭제">
                  <Trash2 size={12} className="text-[var(--color-muted)]" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
