import { describe, expect, it } from 'vitest'
import { evalFormula } from './formula'
import type { Property } from '../types'

const props: Property[] = [
  { id: 'p1', name: 'Points', type: 'number' },
  { id: 'p2', name: 'Cost', type: 'number' },
]

describe('evalFormula', () => {
  it('computes prop math', () => {
    const row = { id: 'r', values: { p1: 3, p2: 5 } }
    expect(evalFormula('prop("Points") * 2', row, props)).toBe(6)
    expect(evalFormula('prop("Points") + prop("Cost")', row, props)).toBe(8)
  })

  it('returns null for empty', () => {
    expect(evalFormula('', { id: 'r', values: {} }, props)).toBeNull()
  })

  it('rejects unsafe expressions', () => {
    expect(evalFormula('prop("Points"); alert(1)', { id: 'r', values: { p1: 1 } }, props)).toBe(
      '…',
    )
  })
})
