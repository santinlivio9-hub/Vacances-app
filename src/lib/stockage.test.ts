import { describe, expect, it } from 'vitest'
import {
  ecrireChecklist,
  lireChecklist,
  lireSimulations,
  MAX_SIMULATIONS,
  sauvegarderSimulation,
  supprimerSimulation,
  type Stockage,
} from './stockage'

function stockageMemoire(): Stockage & { donnees: Map<string, string> } {
  const donnees = new Map<string, string>()
  return {
    donnees,
    getItem: (cle) => donnees.get(cle) ?? null,
    setItem: (cle, valeur) => void donnees.set(cle, valeur),
    removeItem: (cle) => void donnees.delete(cle),
  }
}

const stockagePlein: Stockage = {
  getItem: () => null,
  setItem: () => {
    throw new Error('QuotaExceededError')
  },
  removeItem: () => {},
}

describe('simulations sauvegardées', () => {
  it('sauvegarde, liste (plus récente d’abord) et supprime', () => {
    const s = stockageMemoire()
    const a = sauvegarderSimulation({ nom: 'Nice', parametres: 'd=nice' }, s)!
    const b = sauvegarderSimulation({ nom: 'Rome', parametres: 'd=rome' }, s)!
    expect(lireSimulations(s).map((x) => x.nom)).toEqual(['Rome', 'Nice'])
    expect(supprimerSimulation(a.id, s)).toBe(true)
    expect(lireSimulations(s).map((x) => x.id)).toEqual([b.id])
  })

  it('remplace une simulation identique au lieu de la dupliquer', () => {
    const s = stockageMemoire()
    sauvegarderSimulation({ nom: 'Nice', parametres: 'd=nice' }, s)
    sauvegarderSimulation({ nom: 'Nice (bis)', parametres: 'd=nice' }, s)
    expect(lireSimulations(s)).toHaveLength(1)
    expect(lireSimulations(s)[0].nom).toBe('Nice (bis)')
  })

  it(`garde au plus ${MAX_SIMULATIONS} simulations`, () => {
    const s = stockageMemoire()
    for (let i = 0; i < MAX_SIMULATIONS + 5; i++) sauvegarderSimulation({ nom: `#${i}`, parametres: `n=${i}` }, s)
    expect(lireSimulations(s)).toHaveLength(MAX_SIMULATIONS)
  })

  it('résiste à un stockage absent, plein ou corrompu', () => {
    expect(lireSimulations(null)).toEqual([])
    expect(sauvegarderSimulation({ nom: 'x', parametres: 'y' }, null)).toBeNull()
    expect(sauvegarderSimulation({ nom: 'x', parametres: 'y' }, stockagePlein)).toBeNull()
    const s = stockageMemoire()
    s.setItem('budget-voyage:simulations:v1', '{pas du json')
    expect(lireSimulations(s)).toEqual([])
    s.setItem('budget-voyage:simulations:v1', JSON.stringify([{ id: 1 }, { id: 'a', nom: 'b', creeLe: 'c', parametres: 'd' }]))
    expect(lireSimulations(s)).toHaveLength(1)
  })
})

describe('checklist des réservations', () => {
  it('mémorise les cases cochées par voyage', () => {
    const s = stockageMemoire()
    ecrireChecklist('voyage-1', ['transport'], s)
    ecrireChecklist('voyage-2', ['logement'], s)
    expect(lireChecklist('voyage-1', s)).toEqual(['transport'])
    expect(lireChecklist('voyage-2', s)).toEqual(['logement'])
    expect(lireChecklist('inconnu', s)).toEqual([])
    expect(lireChecklist('voyage-1', null)).toEqual([])
  })
})
