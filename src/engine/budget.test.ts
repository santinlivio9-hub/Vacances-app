import { describe, expect, it } from 'vitest'
import type { Reglages, ReglagesSimples } from '../domain/types'
import { ajusterAuBudget, appliquerChangement, fusionnerChangements } from './budget'
import { estimerCouts, type EntreeCouts } from './couts'
import { reglagesSimplesParDefaut } from './reglages'

const simple: ReglagesSimples = { ...reglagesSimplesParDefaut('2027-04-01'), dateDepart: '2027-07-10', style: 'confort', transport: 'avion' }
const entree = (s: Partial<ReglagesSimples> = {}, modifies: Reglages['modifies'] = {}): EntreeCouts => ({
  trajet: { depart: { lat: 48.86, lon: 2.35 }, arrivee: { lat: 38.72, lon: -9.14 }, distanceVolKm: 1450, distanceRouteKm: 1810, routeTerrestre: true },
  arrivee: { lat: 38.72, lon: -9.14, pays: 'pt' },
  reglages: { simple: { ...simple, ...s }, modifies },
})

describe('ajusterAuBudget', () => {
  it('propose des économies chiffrées, triées, qui ne rendent jamais le voyage impossible', () => {
    const e = entree()
    const total = estimerCouts(e).total
    const r = ajusterAuBudget(e, total * 0.7)
    expect(r.depassement).toBeCloseTo(total * 0.3)
    expect(r.suggestions.length).toBeGreaterThan(5)
    for (const s of r.suggestions) {
      expect(s.economie).toBeGreaterThan(0)
      const apres = estimerCouts(appliquerChangement(e, s.changement))
      expect(apres.transport.possible).toBe(true)
      expect(apres.total).toBeCloseTo(total - s.economie, 6)
    }
    expect(r.suggestions.some((s) => s.id === 'etoiles')).toBe(true)
  })

  it('trouve une combinaison qui tient le budget quand c’est possible', () => {
    const e = entree()
    const total = estimerCouts(e).total
    const r = ajusterAuBudget(e, total * 0.7)
    expect(r.atteignable).toBe(true)
    expect(r.totalApresPlan).toBeLessThanOrEqual(total * 0.7)
    const final = estimerCouts(appliquerChangement(e, fusionnerChangements(r.plan)))
    expect(final.total).toBeCloseTo(r.totalApresPlan, 0)
  })

  it('budget beaucoup trop faible : fait de son mieux et le dit', () => {
    const r = ajusterAuBudget(entree(), 100)
    expect(r.atteignable).toBe(false)
    expect(r.plan.length).toBeGreaterThan(3)
    expect(r.totalApresPlan).toBeLessThan(r.totalInitial * 0.6)
  })

  it('ne propose pas de passer à un mode impossible', () => {
    const r = ajusterAuBudget({ ...entree(), trajet: { ...entree().trajet, routeTerrestre: false } }, 500)
    expect(r.suggestions.some((s) => s.changement.simple?.transport && s.changement.simple.transport !== 'avion')).toBe(false)
  })
})

describe('plan d’économies', () => {
  it('pour un petit dépassement, préfère des pistes ciblées à un changement de style', () => {
    const e = entree()
    const r = ajusterAuBudget(e, estimerCouts(e).total * 0.92)
    expect(r.atteignable).toBe(true)
    expect(r.plan.some((s) => s.id === 'style')).toBe(false)
  })
})
