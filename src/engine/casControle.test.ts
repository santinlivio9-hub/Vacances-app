import { describe, expect, it } from 'vitest'
import type { Coordonnees, Reglages, ReglagesSimples } from '../domain/types'
import { harmoniserSimple } from '../tripTypes'
import { estimationEnDirect } from './estimation'
import { distanceKm } from './geo'
import { reglagesSimplesParDefaut } from './reglages'
import { comparerTrajets } from './trajets'

/**
 * Cas de contrôle : le moteur doit tomber dans une fourchette de référence construite à partir
 * de sources publiques (détail dans src/data/SOURCES.md, section v5). Distances et durées de route
 * figées (valeurs OSRM) pour que le test ne dépende pas du réseau.
 */
const AUJOURDHUI = '2026-11-24'
const TROYES = { lat: 48.2973, lon: 4.0744, pays: 'fr' }
const PARIS = { lat: 48.8566, lon: 2.3522, pays: 'fr' }

function estimer(noms: [string, string], a: Coordonnees, b: Coordonnees & { pays: string }, km: number, min: number, s: Partial<ReglagesSimples>, modifies: Reglages['modifies'] = {}) {
  const simple = harmoniserSimple({ ...reglagesSimplesParDefaut(AUJOURDHUI), ...s } as ReglagesSimples)
  const trajet = { depart: a, arrivee: b, distanceVolKm: distanceKm(a, b), distanceRouteKm: km, dureeRouteMin: min, routeTerrestre: true, noms }
  return estimationEnDirect({ trajet, arrivee: b, reglages: { simple, modifies } }, AUJOURDHUI)
}

describe('cas de contrôle (fourchettes de référence sourcées)', () => {
  it('Troyes → Lyon, 2 personnes, 2 nuits mi-décembre : 650 à 1 150 €', () => {
    const e = estimer(['Troyes', 'Lyon'], TROYES, { lat: 45.764, lon: 4.8357, pays: 'fr' }, 360, 215, { dateDepart: '2026-12-15', nuits: 2, adultes: 2 })
    expect(e.total).toBeGreaterThan(650)
    expect(e.total).toBeLessThan(1150)
    expect(e.couts.ville).toBe('Lyon')
    // Transport aller-retour pour 2 : 100 à 260 € (train via Dijon, voiture ou covoiturage)
    expect(e.couts.postes.transport).toBeGreaterThan(100)
    expect(e.couts.postes.transport).toBeLessThan(260)
    expect(e.fourchette.bas).toBeLessThan(e.total)
    expect(e.fourchette.haut).toBeGreaterThan(e.total)
  })

  it('Paris → Lisbonne, 2 personnes, 7 nuits en juillet : 2 200 à 3 800 €', () => {
    const e = estimer(['Paris', 'Lisbonne'], PARIS, { lat: 38.7223, lon: -9.1393, pays: 'pt' }, 1740, 1020, { dateDepart: '2027-07-10', nuits: 7, adultes: 2, transport: 'avion' })
    expect(e.total).toBeGreaterThan(2200)
    expect(e.total).toBeLessThan(3800)
    expect(e.couts.transport.option?.mode).toBe('avion')
    // Vols aller-retour pour 2 en juillet, bagages compris : 450 à 1 000 €
    expect(e.couts.postes.transport).toBeGreaterThan(450)
    expect(e.couts.postes.transport).toBeLessThan(1000)
  })

  it('Troyes → Pau, stage de 11 semaines en colocation : 950 à 1 450 € par mois', () => {
    const e = estimer(['Troyes', 'Pau'], TROYES, { lat: 43.2951, lon: -0.3708, pays: 'fr' }, 900, 520, {
      typeVoyage: 'stage',
      dateDepart: '2027-03-29',
      adultes: 1,
      logements: ['colocation'],
      stage: { ...reglagesSimplesParDefaut(AUJOURDHUI).stage, dateFin: '2027-06-13' },
    })
    const b = e.sejourLong!
    expect(b.totalMensuel).toBeGreaterThan(950)
    expect(b.totalMensuel).toBeLessThan(1450)
    // Gratification légale : 4,50 € de l'heure, au-delà de 308 heures
    expect(b.gratification.total).toBeGreaterThan(1500)
  })

  it('Paris → Marseille, 1 personne, week-end en TGV : réserver tôt coûte bien moins cher qu’à la dernière minute', () => {
    const s = { typeVoyage: 'weekend' as const, dateDepart: '2027-03-12', nuits: 2, adultes: 1, transport: 'train' as const, trajetChoisi: 'train' as const }
    const tot = estimer(['Paris', 'Marseille'], PARIS, { lat: 43.2965, lon: 5.3698, pays: 'fr' }, 775, 450, s, { reservation: 'tot' })
    const tard = estimer(['Paris', 'Marseille'], PARIS, { lat: 43.2965, lon: 5.3698, pays: 'fr' }, 775, 450, s, { reservation: 'derniere' })
    // Tarifs SNCF 2026 Paris Gare de Lyon ↔ Marseille Saint-Charles : OUIGO 19 à 109 €, TGV INOUI 25,50 à 138 € l'aller
    expect(tot.couts.postes.transport).toBeGreaterThanOrEqual(2 * 19)
    expect(tard.couts.postes.transport).toBeLessThanOrEqual(2 * 138 + 20)
    expect(tot.couts.postes.transport).toBeLessThan(tard.couts.postes.transport * 0.5)
    expect(tot.couts.transport.option?.etapes.some((e) => e.mode === 'train' && e.tarifOfficiel)).toBe(true)
  })
})

describe('trajets combinés', () => {
  const av = { vehicules: 1, consommationL100: 6.5, prixCarburant: 2.04, peages: true, classe: 'eco' as const, bagagesSoute: false, rayonHubMin: 90, accesGare: 'parking' as const, carteReduction: 'aucune' as const, reservation: 'normal' as const, usure: false }
  const trajet = (a: Coordonnees, b: Coordonnees, km: number, min: number) => ({ depart: a, arrivee: b, distanceVolKm: distanceKm(a, b), distanceRouteKm: km, dureeRouteMin: min, routeTerrestre: true })

  it('passe par Paris pour Troyes → Pau, avec changement de gare', () => {
    const r = comparerTrajets(trajet(TROYES, { lat: 43.2951, lon: -0.3708 }, 900, 520), { adultes: 1, enfants: 0, nuits: 2, saison: 'moyenne', av }, { priorite: 'compromis', combinaisons: true })
    const train = r.options.find((o) => o.type === 'train')!
    expect(train.etapes.filter((e) => e.mode === 'train').map((e) => e.vers)[0]).toMatch(/^Paris/)
    expect(train.etapes.some((e) => e.detail?.includes('Changement de gare'))).toBe(true)
  })

  it('sans combinaisons, ne propose pas de voiture jusqu’à la gare', () => {
    const r = comparerTrajets(trajet(TROYES, { lat: 45.764, lon: 4.8357 }, 360, 215), { adultes: 2, enfants: 0, nuits: 2, saison: 'basse', av }, { priorite: 'prix', combinaisons: false })
    expect(r.options.some((o) => o.combine)).toBe(false)
  })

  it('écarte un rabattement plus long que le trajet principal', () => {
    // Dijon → Beaune (40 km) : aucune option combinée ne doit survivre
    const r = comparerTrajets(trajet({ lat: 47.322, lon: 5.0415 }, { lat: 47.0242, lon: 4.8386 }, 45, 40), { adultes: 1, enfants: 0, nuits: 1, saison: 'basse', av }, { priorite: 'compromis', combinaisons: true })
    expect(r.options.every((o) => !o.combine)).toBe(true)
  })

  it('la carte Avantage fait baisser le prix du TGV', () => {
    const t = trajet(PARIS, { lat: 45.764, lon: 4.8357 }, 465, 270)
    const sans = comparerTrajets(t, { adultes: 1, enfants: 0, nuits: 2, saison: 'moyenne', av: { ...av, classe: 'premium' } }, { priorite: 'prix', combinaisons: true })
    const avec = comparerTrajets(t, { adultes: 1, enfants: 0, nuits: 2, saison: 'moyenne', av: { ...av, classe: 'premium', carteReduction: 'avantage' } }, { priorite: 'prix', combinaisons: true })
    const prix = (r: typeof sans) => r.options.find((o) => o.type === 'train')!.total.milieu
    expect(prix(avec)).toBeLessThanOrEqual(prix(sans))
  })

  it('compte le parking pour tout le séjour en voiture + avion', () => {
    const r = comparerTrajets(trajet(PARIS, { lat: 38.7223, lon: -9.1393 }, 1740, 1020), { adultes: 2, enfants: 0, nuits: 7, saison: 'haute', av }, { priorite: 'compromis', combinaisons: true })
    const o = r.options.find((x) => x.type === 'voiture+avion')
    if (o) expect(o.etapes.find((e) => e.mode === 'parking')?.detail).toBe('Parking, 8 jours')
  })
})
