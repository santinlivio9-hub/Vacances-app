import { describe, expect, it } from 'vitest'
import { destinations, trouverDestination } from '../data'
import { prixIndicatifParJour } from './indicatifs'

describe('prixIndicatifParJour', () => {
  it('additionne une demi-chambre, les repas, les activités et le transport local', () => {
    const nice = trouverDestination('nice')!
    // 135 / 2 + 55 + 25 + 5
    expect(prixIndicatifParJour(nice, 'moyen')).toBe(153)
  })

  it('augmente avec le niveau de confort', () => {
    for (const d of destinations) {
      expect(prixIndicatifParJour(d, 'eco')).toBeLessThan(prixIndicatifParJour(d, 'moyen'))
      expect(prixIndicatifParJour(d, 'moyen')).toBeLessThan(prixIndicatifParJour(d, 'confort'))
    }
  })

  it('classe Bangkok moins cher que New York', () => {
    expect(prixIndicatifParJour(trouverDestination('bangkok')!)).toBeLessThan(prixIndicatifParJour(trouverDestination('new-york')!))
  })
})
