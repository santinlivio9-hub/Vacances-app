import { describe, expect, it } from 'vitest'
import { destinations, trouverDestination, villesDepart } from '../data'
import { destinationsCompatibles, repartirBudget, statutBudget } from './budget'
import { calculerVoyage } from './calculerVoyage'
import type { ParametresVoyage } from './types'

const paris = villesDepart[0]
const voyage: ParametresVoyage = {
  destination: trouverDestination('nice')!,
  depart: paris,
  personnes: 2,
  nuits: 7,
  confort: 'moyen',
  mode: 'train',
}
const criteres = { depart: paris, personnes: 2, nuits: 7, mode: 'train' as const }
const somme = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0)

describe('repartirBudget', () => {
  const { enveloppes, transportCalcule, suffisant } = repartirBudget(3000, voyage)

  it('répartit exactement le budget', () => {
    expect(somme(enveloppes)).toBe(3000)
    expect(suffisant).toBe(true)
  })

  it('met les imprévus de côté (10 % du reste)', () => {
    expect(enveloppes.imprevus).toBe(Math.round(3000 - 3000 / 1.1))
  })

  it('donne au transport son coût réellement calculé', () => {
    expect(transportCalcule).toBe(calculerVoyage(voyage).postes.transport)
    expect(enveloppes.transport).toBe(transportCalcule)
  })

  it('partage le reste en 35 / 25 / 15', () => {
    const reste = enveloppes.logement + enveloppes.repas + enveloppes.activites
    expect(enveloppes.logement / reste).toBeCloseTo(35 / 75, 2)
    expect(enveloppes.repas / reste).toBeCloseTo(25 / 75, 2)
    expect(enveloppes.activites / reste).toBeCloseTo(15 / 75, 2)
  })

  it('signale un budget trop faible pour le seul transport', () => {
    const r = repartirBudget(200, { ...voyage, destination: trouverDestination('new-york')!, mode: 'avion' })
    expect(r.suffisant).toBe(false)
    expect(r.enveloppes.logement).toBe(0)
    expect(r.enveloppes.repas).toBe(0)
  })

  it('refuse un budget nul ou négatif', () => {
    expect(() => repartirBudget(0, voyage)).toThrow(/budget/)
    expect(() => repartirBudget(-50, voyage)).toThrow(/budget/)
    expect(() => repartirBudget(Number.NaN, voyage)).toThrow(/budget/)
  })
})

describe('statutBudget', () => {
  it('classe selon la marge', () => {
    expect(statutBudget(1000, 150)).toBe('large')
    expect(statutBudget(1000, 100)).toBe('large')
    expect(statutBudget(1000, 50)).toBe('juste')
    expect(statutBudget(1000, 0)).toBe('juste')
    expect(statutBudget(1000, -1)).toBe('depasse')
  })
})

describe('destinationsCompatibles', () => {
  it('évalue les 12 destinations', () => {
    expect(destinationsCompatibles(3000, criteres)).toHaveLength(destinations.length)
  })

  it('prend le meilleur confort qui tient dans le budget, avec la bonne marge', () => {
    for (const c of destinationsCompatibles(3000, criteres)) {
      expect(c.marge).toBe(3000 - c.resultat.total)
      expect(c.statut).toBe(statutBudget(3000, c.marge))
      if (c.statut !== 'depasse' && c.confort !== 'confort') {
        const meilleur = c.confort === 'eco' ? 'moyen' : 'confort'
        const total = calculerVoyage({ ...criteres, destination: c.destination, confort: meilleur }).total
        expect(total).toBeGreaterThan(3000)
      }
    }
  })

  it('trie : large, puis juste, puis dépassé', () => {
    const ordre = { large: 0, juste: 1, depasse: 2 }
    const statuts = destinationsCompatibles(3000, criteres).map((c) => ordre[c.statut])
    expect(statuts).toEqual([...statuts].sort((a, b) => a - b))
  })

  it('avec un gros budget, tout passe en confort', () => {
    const liste = destinationsCompatibles(100_000, criteres)
    expect(liste.every((c) => c.statut === 'large' && c.confort === 'confort')).toBe(true)
  })

  it('avec un budget trop faible, tout dépasse en éco', () => {
    const liste = destinationsCompatibles(100, criteres)
    expect(liste.every((c) => c.statut === 'depasse' && c.confort === 'eco')).toBe(true)
    // le plus petit dépassement en premier
    expect(liste[0].marge).toBe(Math.max(...liste.map((c) => c.marge)))
  })

  it('respecte le mode souhaité quand il est possible, sinon bascule', () => {
    const liste = destinationsCompatibles(5000, criteres)
    expect(liste.find((c) => c.destination.id === 'nice')?.resultat.transport?.mode).toBe('train')
    expect(liste.find((c) => c.destination.id === 'bangkok')?.resultat.transport?.mode).toBe('avion')
  })
})
