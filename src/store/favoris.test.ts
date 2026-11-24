import { beforeEach, describe, expect, it } from 'vitest'
import { idFavoriDestination, useFavoris } from './favoris'
import { rubriqueDe } from '../pages/MesVoyages'
import type { VoyageSauvegarde } from './voyage'
import { reglagesSimplesParDefaut } from '../engine/reglages'

beforeEach(() => useFavoris.setState({ favoris: [] }))

describe('favoris', () => {
  it('ajoute puis retire un favori avec le cœur', () => {
    const f = { id: idFavoriDestination({ lat: 45.9, lon: 6.13 }), type: 'destination' as const, nom: 'Annecy', detail: 'France' }
    expect(useFavoris.getState().basculer(f)).toBe(true)
    expect(useFavoris.getState().favoris).toHaveLength(1)
    expect(useFavoris.getState().basculer(f)).toBe(false)
    expect(useFavoris.getState().favoris).toHaveLength(0)
  })
})

describe('rubriques de « Mes voyages »', () => {
  const voyage = (dateDepart: string, statut: VoyageSauvegarde['statut'] = 'calcule') =>
    ({ statut, reglages: { simple: { ...reglagesSimplesParDefaut('2026-01-01'), dateDepart, nuits: 5 }, modifies: {} } }) as VoyageSauvegarde
  it('range les voyages en à venir, brouillons et passés', () => {
    expect(rubriqueDe(voyage('2026-12-20'), '2026-11-24')).toBe('a-reserver')
    expect(rubriqueDe(voyage('2026-11-21'), '2026-11-24')).toBe('a-reserver') // en cours
    expect(rubriqueDe({ ...voyage('2026-12-20'), reserve: true }, '2026-11-24')).toBe('reserves')
    expect(rubriqueDe(voyage('2026-10-01'), '2026-11-24')).toBe('passes')
    expect(rubriqueDe(voyage('2026-10-01', 'brouillon'), '2026-11-24')).toBe('brouillons')
  })
})
