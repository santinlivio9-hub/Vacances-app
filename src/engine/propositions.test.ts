import { describe, expect, it } from 'vitest'
import type { Reglages, ReglagesSimples } from '../domain/types'
import { harmoniserSimple } from '../tripTypes'
import { genererPropositions, type EntreePropositions } from './propositions'
import { reglagesSimplesParDefaut } from './reglages'
import type { DonneesTrajet } from './transport'

const troyesAnnecy: DonneesTrajet = { depart: { lat: 48.2973, lon: 4.0744 }, arrivee: { lat: 45.8992, lon: 6.1294 }, distanceVolKm: 305, distanceRouteKm: 435, dureeRouteMin: 285, routeTerrestre: true }
const parisLisbonne: DonneesTrajet = { depart: { lat: 48.86, lon: 2.35 }, arrivee: { lat: 38.72, lon: -9.14 }, distanceVolKm: 1450, distanceRouteKm: 1810, routeTerrestre: true }
const troyesLyon: DonneesTrajet = { depart: { lat: 48.2973, lon: 4.0744 }, arrivee: { lat: 45.7578, lon: 4.832 }, distanceVolKm: 290, distanceRouteKm: 390, dureeRouteMin: 240, routeTerrestre: true }

const reglages = (s: Partial<ReglagesSimples>): Reglages => ({ simple: harmoniserSimple({ ...reglagesSimplesParDefaut('2026-11-24'), dateDepart: '2027-05-15', ...s }), modifies: {} })
const entree = (trajet: DonneesTrajet, pays: string, r: Reglages): EntreePropositions => ({ trajet, arrivee: { ...trajet.arrivee, pays }, reglages: r, aujourdhui: '2026-11-24' })

describe('genererPropositions', () => {
  it('vacances Troyes → Annecy, hôtel + Airbnb : plusieurs propositions comparables, sans doublon', () => {
    const r = genererPropositions(entree(troyesAnnecy, 'fr', reglages({ adultes: 2, transport: 'voiture', logements: ['hotel', 'appartement'] })))
    expect(r.propositions.length).toBeGreaterThanOrEqual(3)
    expect(r.propositions.length).toBeLessThanOrEqual(6)
    expect(r.propositions[0].badges).toContain('moins-chere')
    expect(Math.min(...r.propositions.map((p) => p.total))).toBe(r.propositions[0].total)
    const logements = new Set(r.propositions.map((p) => p.logement))
    expect(logements.has('hotel') && logements.has('appartement')).toBe(true)
    const badges = r.propositions.flatMap((p) => p.badges)
    expect(badges).toContain('rapport')
    expect(badges).toContain('confort')
    expect(new Set(r.propositions.map((p) => p.id)).size).toBe(r.propositions.length)
    for (const p of r.propositions) {
      expect(p.pointsForts.length + p.pointsFaibles.length).toBeGreaterThanOrEqual(2)
      expect(p.postes.reduce((a, x) => a + x.montant, 0)).toBeCloseTo(p.total)
    }
  })

  it('un seul type de logement coché : au moins une proposition', () => {
    const r = genererPropositions(entree(troyesAnnecy, 'fr', reglages({ logements: ['camping'], transport: 'voiture' })))
    expect(r.propositions.length).toBeGreaterThanOrEqual(1)
    expect(r.propositions.every((p) => p.logement === 'camping')).toBe(true)
  })

  it('aucune proposition dans le budget : la moins chère est affichée avec une alerte', () => {
    const r = genererPropositions(entree(parisLisbonne, 'pt', reglages({ transport: 'avion', budget: 300 })))
    expect(r.propositions.length).toBeGreaterThanOrEqual(1)
    expect(r.propositions[0].badges).toContain('moins-chere')
    expect(r.alerte).toMatch(/Aucune proposition ne tient dans votre budget/)
    expect(r.propositions[0].pointsFaibles[0]).toMatch(/Dépasse le budget/)
  })

  it('dates flexibles « peu importe » : la moins chère est à la meilleure période, et d’autres périodes sont proposées', () => {
    const r = genererPropositions(entree(parisLisbonne, 'pt', reglages({ typeVoyage: 'flexible', transport: 'avion', flexible: { dureeMin: 7, dureeMax: 14, moisDebut: null, moisFin: null } })))
    expect(r.periodes?.meilleures).toHaveLength(3)
    expect(r.propositions[0].periode?.dateDepart).toBe(r.periodes!.meilleures[0].dateDepart)
    expect(r.propositions.some((p) => p.badges.includes('periode'))).toBe(true)
  })

  it('stage de 10 semaines à Lyon, colocation + studio : la plus proche du travail et une version par logement', () => {
    const r = genererPropositions(
      entree(
        troyesLyon,
        'fr',
        reglages({ typeVoyage: 'stage', adultes: 1, transport: 'train', logements: ['colocation', 'studio'], dateDepart: '2027-03-01', stage: { dateFin: '2027-05-10', joursParSemaine: 5, heureDebut: '09:00', heureFin: '17:30', trajetMaxMin: 45, retours: 'deux', gratification: 'legale', gratificationMois: 700 } }),
      ),
    )
    expect(r.propositions.length).toBeGreaterThanOrEqual(3)
    expect(r.propositions.some((p) => p.badges.includes('proche') && p.zone?.id === 'proche')).toBe(true)
    expect(new Set(r.propositions.map((p) => p.logement))).toEqual(new Set(['colocation', 'studio']))
    expect(r.propositions.every((p) => p.sejourLong && p.sejourLong.totalMensuel > 0)).toBe(true)
  })

  it('week-end : pas de trajet de plus de 6 heures quand il existe plus court', () => {
    const r = genererPropositions(entree(troyesAnnecy, 'fr', reglages({ typeVoyage: 'weekend', transport: 'voiture', nuits: 2 })))
    expect(r.propositions.every((p) => p.dureeTrajetMin <= 360)).toBe(true)
  })
})
