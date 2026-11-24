import { describe, expect, it } from 'vitest'
import type { Reglages, ReglagesSimples } from '../domain/types'
import { harmoniserSimple } from '../tripTypes'
import { budgetSejourLong, villeProche, zonesTrajet } from './sejourLong'
import { reglagesSimplesParDefaut } from './reglages'
import type { DonneesTrajet } from './transport'

const troyesLyon: DonneesTrajet = { depart: { lat: 48.2973, lon: 4.0744 }, arrivee: { lat: 45.7578, lon: 4.832 }, distanceVolKm: 290, distanceRouteKm: 390, dureeRouteMin: 240, routeTerrestre: true }
const stage = (s: Partial<ReglagesSimples> = {}, modifies: Reglages['modifies'] = {}): Reglages => ({
  simple: harmoniserSimple({
    ...reglagesSimplesParDefaut('2026-11-24'),
    typeVoyage: 'stage',
    adultes: 1,
    transport: 'train',
    logements: ['colocation', 'studio'],
    dateDepart: '2027-03-01',
    stage: { dateFin: '2027-05-01', joursParSemaine: 5, heureDebut: '09:00', heureFin: '17:30', trajetMaxMin: 45, retours: 'deux' },
    ...s,
  }),
  modifies,
})
const entree = (r: Reglages, extra = {}) => ({ trajet: troyesLyon, arrivee: { ...troyesLyon.arrivee, pays: 'fr' }, reglages: r, ...extra })

describe('stage de 2 mois à Lyon', () => {
  const b = budgetSejourLong(entree(stage()))

  it('calcule un budget mensuel réaliste et un total du séjour', () => {
    expect(b.mois).toBeCloseTo(61 / 30.44, 1)
    expect(b.ville.nom).toBe('Lyon')
    expect(b.parMois.loyer).toBeGreaterThan(400)
    expect(b.parMois.loyer).toBeLessThan(900)
    expect(b.totalMensuel).toBeGreaterThan(900)
    expect(b.totalMensuel).toBeLessThan(2000)
    expect(b.total).toBeCloseTo(b.totalMensuel * b.mois + b.ponctuel.voyage + b.ponctuel.installation)
  })

  it('compte les retours le week-end et l’abonnement remboursé à moitié', () => {
    const jamais = budgetSejourLong(entree(stage({ stage: { ...stage().simple.stage, retours: 'jamais' } })))
    const chaque = budgetSejourLong(entree(stage({ stage: { ...stage().simple.stage, retours: 'chaque' } })))
    expect(jamais.parMois.retours).toBe(0)
    expect(chaque.parMois.retours).toBeCloseTo(2 * b.parMois.retours)
    const sansRemboursement = budgetSejourLong(entree(stage({}, { remboursementTransport: false })))
    expect(sansRemboursement.parMois.trajets).toBeCloseTo(2 * b.parMois.trajets)
  })

  it('la colocation coûte moins cher qu’un studio, et vivre tout près coûte plus cher en loyer', () => {
    const coloc = budgetSejourLong(entree(stage(), { logement: 'colocation' }))
    const studio = budgetSejourLong(entree(stage(), { logement: 'studio' }))
    expect(coloc.parMois.loyer).toBeLessThan(studio.parMois.loyer)
    const proche = budgetSejourLong(entree(stage(), { zone: 'proche' }))
    const loin = budgetSejourLong(entree(stage(), { zone: 'eloignee' }))
    expect(proche.parMois.loyer).toBeGreaterThan(loin.parMois.loyer)
    expect(proche.parMois.trajets).toBe(0)
  })

  it('Paris est plus cher qu’une petite ville', () => {
    const paris = budgetSejourLong({ ...entree(stage()), arrivee: { lat: 48.8566, lon: 2.3522, pays: 'fr' } })
    const petite = budgetSejourLong({ ...entree(stage()), arrivee: { lat: 47.08, lon: 2.4, pays: 'fr' } })
    expect(paris.parMois.loyer).toBeGreaterThan(petite.parMois.loyer * 1.5)
    expect(villeProche({ lat: 47.08, lon: 2.4 })).toBeNull()
  })
})

describe('zones autour du lieu de travail', () => {
  it('trois anneaux qui s’emboîtent quand on accepte 45 minutes, deux pour 20 minutes', () => {
    const z = zonesTrajet(45, { abonnement: 70, remboursement: true })
    expect(z.map((x) => x.id)).toEqual(['proche', 'moyenne', 'eloignee'])
    expect(z[0].rayonMaxKm).toBeCloseTo(z[1].rayonMinKm)
    expect(z[1].rayonMaxKm).toBeCloseTo(z[2].rayonMinKm)
    expect(z[1].coutTrajetMois).toBe(35)
    expect(zonesTrajet(20, { abonnement: 70, remboursement: false })).toHaveLength(2)
  })
})
