import { describe, expect, it } from 'vitest'
import type { Reglages, ReglagesSimples } from '../domain/types'
import { harmoniserSimple } from '../tripTypes'
import { budgetSejourLong, gratificationStage, heuresParJour, joursDePresence, villeProche, zonesTrajet } from './sejourLong'
import { estimationEnDirect } from './estimation'
import { genererPropositions } from './propositions'
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
    stage: { dateFin: '2027-05-01', joursParSemaine: 5, heureDebut: '09:00', heureFin: '17:30', trajetMaxMin: 45, retours: 'deux', gratification: 'legale', gratificationMois: 700 },
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

describe('gratification et reste à charge (stage à Pau, 30 mars → 18 juin 2027)', () => {
  const troyesPau: DonneesTrajet = { depart: { lat: 48.2973, lon: 4.0744 }, arrivee: { lat: 43.2951, lon: -0.3708 }, distanceVolKm: 640, distanceRouteKm: 820, dureeRouteMin: 575, routeTerrestre: true }
  const pau = (s: Partial<ReglagesSimples> = {}, st: Partial<ReglagesSimples['stage']> = {}): Reglages =>
    stage({ logements: ['colocation'], dateDepart: '2027-03-30', transport: 'train', ...s, stage: { ...stage().simple.stage, dateFin: '2027-06-18', retours: 'deux', ...st } })
  const budget = (r: Reglages) => budgetSejourLong({ trajet: troyesPau, arrivee: { ...troyesPau.arrivee, pays: 'fr' }, reglages: r })

  it('6 semaines : gratification pas obligatoire ; 10 semaines : obligatoire', () => {
    expect(joursDePresence('2027-03-01', '2027-04-11', 5)).toBe(30)
    expect(gratificationStage({ ...stage().simple.stage, dateFin: '2027-04-11' }, '2027-03-01', 1.4).obligatoire).toBe(false) // 30 j × 7,5 h = 225 h
    const dix = gratificationStage({ ...stage().simple.stage, dateFin: '2027-05-09' }, '2027-03-01', 2.3)
    expect(dix.joursPresence).toBe(50)
    expect(dix.obligatoire).toBe(true) // 375 h > 308 h
    expect(dix.total).toBeCloseTo(50 * 7.5 * 4.5)
  })

  it('heures de présence : pause d’une heure au-delà de 6 heures', () => {
    expect(heuresParJour('09:00', '17:30')).toBe(7.5)
    expect(heuresParJour('09:00', '13:00')).toBe(4)
  })

  it('le total se vérifie à la main : mois × dépenses mensuelles + frais ponctuels ; le dépôt de garantie n’en fait pas partie', () => {
    const b = budget(pau())
    expect(b.total).toBeCloseTo(b.mois * b.totalMensuel + b.fraisPonctuels)
    expect(b.fraisPonctuels).toBeCloseTo(b.ponctuel.voyage + b.ponctuel.installation)
    expect(b.depotGarantie).toBeGreaterThan(300)
    expect(b.total).toBeLessThan(b.mois * b.totalMensuel + b.fraisPonctuels + 1) // dépôt non compté
    expect(b.ville.nom).toBe('Pau')
    expect(b.parMois.loyer).toBeGreaterThan(350)
    expect(b.parMois.loyer).toBeLessThan(470)
  })

  it('reste à charge = dépenses − gratification, par mois et pour tout le séjour', () => {
    const b = budget(pau())
    expect(b.gratification.obligatoire).toBe(true)
    expect(b.resteAChargeMois).toBeCloseTo(b.totalMensuel - b.gratification.parMois)
    expect(b.resteAChargeTotal).toBeCloseTo(b.total - b.gratification.total)
    const sans = budget(pau({}, { gratification: 'aucune' }))
    expect(sans.resteAChargeTotal).toBeCloseTo(sans.total)
    const perso = budget(pau({}, { gratification: 'personnalisee', gratificationMois: 2000 }))
    expect(perso.resteAChargeMois).toBeLessThan(0) // excédent
  })

  it('les retours le week-end sont un poste à part, détaillé (nombre × prix)', () => {
    const b = budget(pau())
    expect(b.parMois.retours).toBeCloseTo(b.retour.prix * b.retour.parMois)
    expect(b.details.retours[0].libelle).toMatch(/allers-retours par mois × \d+ €/)
  })

  it('la barre de la configuration et « Mon voyage » donnent le même total', () => {
    const entree = { trajet: troyesPau, arrivee: { ...troyesPau.arrivee, pays: 'fr' }, reglages: pau(), aujourdhui: '2026-11-24' }
    const enDirect = estimationEnDirect(entree, '2026-11-24')
    expect(enDirect.total).toBeCloseTo(budget(pau()).total)
    // Après le choix d'une proposition, ses réglages donnent exactement son total
    for (const p of genererPropositions(entree).propositions) {
      expect(estimationEnDirect({ ...entree, reglages: p.reglages }, '2026-11-24').total).toBeCloseTo(p.total)
    }
  })
})
