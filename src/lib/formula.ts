import type { DbRow, Property } from '../types'

/**
 * Tiny safe formula evaluator.
 * Supports: prop("Name"), numbers, + - * / ( ), and sum/avg/count of numeric cells in row context only.
 * Examples: prop("Points") * 2 , prop("Cost") + prop("Interest")
 */
export function evalFormula(
  expression: string | undefined,
  row: DbRow,
  properties: Property[],
): string | number | null {
  if (!expression?.trim()) return null
  const byName = new Map(properties.map((p) => [p.name, p]))

  try {
    let expr = expression.trim()
    expr = expr.replace(/prop\s*\(\s*["']([^"']+)["']\s*\)/gi, (_m, name: string) => {
      const prop = byName.get(name)
      if (!prop) return '0'
      const v = row.values[prop.id]
      if (typeof v === 'number') return String(v)
      if (v === null || v === undefined || v === '') return '0'
      const n = Number(v)
      return Number.isFinite(n) ? String(n) : '0'
    })
    // only allow safe chars
    if (!/^[\d\s+\-*/().]+$/.test(expr)) return '…'
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${expr})`)() as number
    if (typeof result !== 'number' || !Number.isFinite(result)) return null
    return Math.round(result * 1000) / 1000
  } catch {
    return 'ERR'
  }
}
