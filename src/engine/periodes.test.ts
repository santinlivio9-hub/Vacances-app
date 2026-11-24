import { describe, expect, it } from 'vitest'
import type { Reglages, ReglagesSimples } from '../domain/types'
import type { DonneesTrajet } from './transport'
import { meilleuresPeriodes, moisCandidats, moisDansPeriode } from './periodes'
import { reglagesSimplesParDefaut } from './reglages'

const parisLisbonne: DonneesTrajet = { depart: { lat: 48.86, lon: 2.35 }, arrivee: { lat: 38.72, lon: -9.14 }, distanceVolKm: 1450, distanceRouteKm: 1810, routeTerrestre: true }
const simple = (s: Partial<ReglagesSimples> = {}): Reglages => ({
  simple: { ...reglagesSimplesParDefaut('2026-11-24'), typeVoyage: 'flexible', transport: 'avion', ...s },
  modifies: {},
})
const entree = (r: Reglages) => ({ trajet: parisLisbonne, arrivee: { ...parisLisbonne.arrivee, pays: 'pt' }, reglages: r })

describe('dates flexibles', () => {
  it('« peu importe quand » : teste 12 mois et garde les 3 moins chers, triés', () => {
    const r = meilleuresPeriodes(entree(simple({ flexible: { dureeMin: 7, dureeMax: 14, moisDebut: null, moisFin: null } })), '2026-11-24')
    expect(r.periodes).toHaveLength(12)
    expect(r.meilleures).toHaveLength(3)
    expect(r.meilleures[0].total).toBeLessThanOrEqual(r.meilleures[1].total)
    expect(r.meilleures[1].total).toBeLessThanOrEqual(r.meilleures[2].total)
    // Les moins chers évitent la haute saison et l'écart avec le mois le plus cher est réel
    expect(r.meilleures.every((p) => p.saison !== 'haute')).toBe(true)
    expect(r.ecartMax).toBeGreaterThan(100)
    // Deux semaines coûtent plus qu'une
    expect(r.meilleures[0].totalMax).toBeGreaterThan(r.meilleures[0].total)
    // Départ au moins 3 semaines après aujourd'hui
    expect(r.periodes.every((p) => p.dateDepart >= '2026-12-15')).toBe(true)
  })

  it('période uniquement en haute saison : résultats quand même, avec une alerte', () => {
    const r = meilleuresPeriodes(entree(simple({ flexible: { dureeMin: 7, dureeMax: 7, moisDebut: 7, moisFin: 8 } })), '2026-11-24')
    expect(r.periodes.map((p) => p.mois)).toEqual([7, 8])
    expect(r.meilleures.length).toBeGreaterThanOrEqual(1)
    expect(r.toutesHauteSaison).toBe(true)
    expect(r.alerte).toMatch(/haute saison/)
  })

  it('gère une période à cheval sur deux années', () => {
    expect(moisDansPeriode(12, { moisDebut: 11, moisFin: 2 })).toBe(true)
    expect(moisDansPeriode(1, { moisDebut: 11, moisFin: 2 })).toBe(true)
    expect(moisDansPeriode(6, { moisDebut: 11, moisFin: 2 })).toBe(false)
    expect(moisCandidats({ moisDebut: 11, moisFin: 2 }, '2026-11-24').map((m) => m.mois)).toEqual([12, 1, 2, 11])
  })
})
