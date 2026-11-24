import { describe, expect, it } from 'vitest'
import { formatDuree, formatEuros, formatKm } from './format'

describe('formats', () => {
  it('durées', () => {
    expect(formatDuree(250)).toBe('4 h 10')
    expect(formatDuree(43)).toBe('45 min')
    expect(formatDuree(120)).toBe('2 h')
    expect(formatDuree(1600)).toBe('1 j 2 h')
  })
  it('distances arrondies', () => {
    expect(formatKm(432.4)).toBe('430 km')
    expect(formatKm(5843).replace(/\s/g, ' ')).toBe('5 840 km')
    expect(formatKm(3.24)).toBe('3,2 km')
  })
  it('euros sans centimes', () => {
    expect(formatEuros(1234.6).replace(/\s/g, ' ')).toBe('1 235 €')
  })
})
