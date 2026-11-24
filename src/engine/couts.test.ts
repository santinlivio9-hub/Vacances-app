import { describe, expect, it } from 'vitest'
import type { Reglages, ReglagesSimples } from '../domain/types'
import { estimerCouts, etatBudget, POSTES } from './couts'
import { reglagesAvancesParDefaut, reglagesSimplesParDefaut } from './reglages'
import { estimerTransport, type DonneesTrajet } from './transport'

const base: ReglagesSimples = { ...reglagesSimplesParDefaut('2027-04-01'), dateDepart: '2027-05-10' }
const troyesAnnecy: DonneesTrajet = { depart: { lat: 48.2973, lon: 4.0744 }, arrivee: { lat: 45.8992, lon: 6.1294 }, distanceVolKm: 305, distanceRouteKm: 435, dureeRouteMin: 285, routeTerrestre: true }
const parisLisbonne: DonneesTrajet = { depart: { lat: 48.86, lon: 2.35 }, arrivee: { lat: 38.72, lon: -9.14 }, distanceVolKm: 1450, distanceRouteKm: 1810, routeTerrestre: true }
const lyonNewYork: DonneesTrajet = { depart: { lat: 45.76, lon: 4.84 }, arrivee: { lat: 40.71, lon: -74 }, distanceVolKm: 6200, distanceRouteKm: 7750, routeTerrestre: false }

const reglages = (s: Partial<ReglagesSimples> = {}, modifies: Reglages['modifies'] = {}): Reglages => ({ simple: { ...base, ...s }, modifies })
const estimer = (trajet: DonneesTrajet, pays: string, r: Reglages) => estimerCouts({ trajet, arrivee: { ...trajet.arrivee, pays }, reglages: r })

describe('estimerTransport', () => {
  const av = reglagesAvancesParDefaut(base)
  it('voiture : carburant + péages partagés, indépendants du nombre de passagers', () => {
    const deux = estimerTransport('voiture', troyesAnnecy, { adultes: 2, enfants: 0 }, av, 'moyenne')
    const trois = estimerTransport('voiture', troyesAnnecy, { adultes: 3, enfants: 0 }, av, 'moyenne')
    expect(deux.total).toBeCloseTo(trois.total)
    expect(deux.total).toBeGreaterThan(100)
    expect(deux.total).toBeLessThan(250)
    expect(deux.dureeAllerMin).toBe(285)
  })

  it('train : le prix suit le nombre de voyageurs, enfants compris', () => {
    const t1 = estimerTransport('train', troyesAnnecy, { adultes: 1, enfants: 0 }, av, 'moyenne')
    const t3 = estimerTransport('train', troyesAnnecy, { adultes: 2, enfants: 1 }, av, 'moyenne')
    expect(t3.total).toBeCloseTo(3 * t1.total)
  })

  it('refuse les modes impossibles avec une raison', () => {
    expect(estimerTransport('voiture', lyonNewYork, base, av, 'moyenne')).toMatchObject({ possible: false })
    expect(estimerTransport('train', lyonNewYork, base, av, 'moyenne').raison).toMatch(/terrestre/)
    expect(estimerTransport('avion', troyesAnnecy, base, av, 'moyenne').possible).toBe(false)
    expect(estimerTransport('car', parisLisbonne, base, av, 'moyenne').possible).toBe(false)
  })

  it('avion : la classe et les bagages font monter le prix', () => {
    const eco = estimerTransport('avion', parisLisbonne, base, { ...av, bagagesSoute: false }, 'moyenne')
    const premium = estimerTransport('avion', parisLisbonne, base, { ...av, classe: 'premium', bagagesSoute: true }, 'moyenne')
    expect(premium.total).toBeGreaterThan(eco.total * 1.8)
  })
})

describe('estimerCouts', () => {
  it('Troyes → Annecy, 2 adultes, 7 nuits en train : ordre de grandeur réaliste', () => {
    const e = estimer(troyesAnnecy, 'fr', reglages({ transport: 'train' }))
    expect(e.total).toBeGreaterThan(1200)
    expect(e.total).toBeLessThan(3500)
    expect(e.parPersonne).toBeCloseTo(e.total / 2)
    expect(POSTES.every((p) => e.postes[p] >= 0)).toBe(true)
    expect(e.total).toBeCloseTo(Object.values(e.postes).reduce((a, b) => a + b, 0))
  })

  it('1 personne, 1 nuit : coûts positifs et cohérents', () => {
    const e = estimer(troyesAnnecy, 'fr', reglages({ adultes: 1, enfants: 0, nuits: 1 }))
    expect(e.total).toBeGreaterThan(100)
    expect(e.parPersonne).toBe(e.total)
  })

  it('nombre impair de voyageurs : un adulte de plus coûte moins qu’un voyageur seul', () => {
    const deux = estimer(troyesAnnecy, 'fr', reglages({ adultes: 2 }))
    const trois = estimer(troyesAnnecy, 'fr', reglages({ adultes: 3 }))
    expect(trois.total).toBeGreaterThan(deux.total)
    expect(trois.parPersonne).toBeLessThan(deux.parPersonne * 1.1)
  })

  it('un enfant coûte moins cher qu’un adulte', () => {
    const adulte = estimer(troyesAnnecy, 'fr', reglages({ adultes: 3, enfants: 0 }, { typeLogement: 'hotel', chambres: 2 }))
    const enfant = estimer(troyesAnnecy, 'fr', reglages({ adultes: 2, enfants: 1 }, { typeLogement: 'hotel', chambres: 2 }))
    expect(enfant.postes.repas).toBeLessThan(adulte.postes.repas)
  })

  it('le confort coûte plus cher que l’éco', () => {
    const eco = estimer(parisLisbonne, 'pt', reglages({ style: 'eco', transport: 'avion' }))
    const confort = estimer(parisLisbonne, 'pt', reglages({ style: 'confort', transport: 'avion' }))
    expect(confort.total).toBeGreaterThan(eco.total * 1.6)
  })

  it('le coût de la vie du pays compte : Lisbonne moins chère que New York à séjour égal', () => {
    const lis = estimer(parisLisbonne, 'pt', reglages({ transport: 'avion' }))
    const ny = estimer(lyonNewYork, 'us', reglages({ transport: 'avion' }))
    expect(ny.postes.logement).toBeGreaterThan(lis.postes.logement * 1.4)
  })

  it('mode de transport impossible : transport à 0 et avertissement', () => {
    const e = estimer(lyonNewYork, 'us', reglages({ transport: 'voiture' }))
    expect(e.transport.possible).toBe(false)
    expect(e.postes.transport).toBe(0)
    expect(e.avertissements.join(' ')).toMatch(/route/)
  })

  it('pays absent de la base : moyenne régionale signalée', () => {
    const e = estimer({ ...lyonNewYork, arrivee: { lat: -16.5, lon: -68.15 } }, 'bo', reglages({ transport: 'avion' }))
    expect(e.pays.estimationContinent).toBe(true)
    expect(e.avertissements[0]).toMatch(/région/)
  })

  it('activités gratuites uniquement : poste activités à zéro', () => {
    expect(estimer(troyesAnnecy, 'fr', reglages({}, { gratuitesUniquement: true })).postes.activites).toBe(0)
  })

  it('les imprévus sont un pourcentage du reste', () => {
    const e = estimer(troyesAnnecy, 'fr', reglages({}, { tauxImprevus: 0.2 }))
    expect(e.postes.imprevus).toBeCloseTo((e.total - e.postes.imprevus) * 0.2)
  })
})

describe('etatBudget', () => {
  it('libre, ok, juste, dépassé', () => {
    expect(etatBudget(1000, null).statut).toBe('libre')
    expect(etatBudget(800, 1000).statut).toBe('ok')
    expect(etatBudget(950, 1000).statut).toBe('juste')
    expect(etatBudget(1200, 1000)).toEqual({ statut: 'depasse', ratio: 1.2 })
  })
})
