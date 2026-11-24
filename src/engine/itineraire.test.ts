import { describe, expect, it } from 'vitest'
import type { LieuVisite, Reglages, ReglagesSimples, TypeActivite } from '../domain/types'
import { generateur } from './aleatoire'
import { activitesGeneriques, capacites, genererItineraire, kMoyennes, remplacerActivite, type EntreeItineraire } from './itineraire'
import { reglagesSimplesParDefaut } from './reglages'

const centre = { lat: 45.8992, lon: 6.1294 }
const types: TypeActivite[] = ['musee', 'monument', 'parc', 'point_de_vue', 'nature', 'spectacle', 'marche', 'zoo']
/** Deux quartiers éloignés de ~10 km, 12 lieux chacun */
const lieux: LieuVisite[] = Array.from({ length: 24 }, (_, i) => ({
  id: `l${i}`,
  nom: `Lieu ${i}`,
  type: types[i % types.length],
  lat: centre.lat + (i < 12 ? 0 : 0.09) + (i % 4) * 0.002,
  lon: centre.lon + (i % 3) * 0.002,
  wikidata: i % 2 ? `Q${i}` : undefined,
  source: 'osm',
}))
const simple: ReglagesSimples = { ...reglagesSimplesParDefaut('2027-04-01'), dateDepart: '2027-05-10', nuits: 4 }
const entree = (s: Partial<ReglagesSimples> = {}, modifies: Reglages['modifies'] = {}, autres: Partial<EntreeItineraire> = {}): EntreeItineraire => ({
  lieux,
  source: 'osm',
  centre,
  ville: 'Annecy',
  reglages: { simple: { ...simple, ...s }, modifies },
  indice: 1,
  mode: 'train',
  dureeAllerMin: 200,
  graine: 1,
  ...autres,
})

describe('aléatoire et regroupement', () => {
  it('même graine, même suite', () => {
    const a = generateur(42)
    const b = generateur(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
    expect(generateur(43)()).not.toBe(generateur(42)())
  })

  it('k-moyennes sépare deux quartiers éloignés', () => {
    const g = kMoyennes(lieux, 2, generateur(1))
    expect(new Set(g.slice(0, 12)).size).toBe(1)
    expect(new Set(g.slice(12)).size).toBe(1)
    expect(g[0]).not.toBe(g[12])
  })
})

describe('capacites', () => {
  it('allège le premier et le dernier jour', () => {
    const c = capacites(4, 2, false)
    expect(c).toHaveLength(5)
    expect(c[0]).toEqual({ type: 'arrivee', places: 1 })
    expect(c[2]).toEqual({ type: 'plein', places: 2 })
    expect(c[4]).toEqual({ type: 'depart', places: 1 })
  })
  it('1 nuit : deux jours, sans activité au départ', () => {
    expect(capacites(1, 2, false).map((j) => j.places)).toEqual([1, 0])
  })
  it('aucune activité le jour d’arrivée après un long trajet', () => {
    expect(capacites(5, 3, false, true)[0].places).toBe(0)
  })
})

describe('genererItineraire', () => {
  it('produit un jour par jour de séjour, dates comprises', () => {
    const it_ = genererItineraire(entree())
    expect(it_.jours).toHaveLength(5)
    expect(it_.jours[0]).toMatchObject({ date: '2027-05-10', type: 'arrivee' })
    expect(it_.jours[4]).toMatchObject({ date: '2027-05-14', type: 'depart' })
    expect(it_.jours[0].notes[0]).toMatch(/Départ conseillé vers \d+ h/)
  })

  it('est déterministe pour une graine, et change avec la graine', () => {
    const ids = (g: number) => genererItineraire(entree({}, {}, { graine: g })).jours.flatMap((j) => j.activites.map((a) => a.lieu.id))
    expect(ids(1)).toEqual(ids(1))
    expect(ids(1)).not.toEqual(ids(7))
  })

  it('ne place jamais deux fois le même lieu', () => {
    const ids = genererItineraire(entree({ nuits: 10 }, { rythme: 3 })).jours.flatMap((j) => j.activites.map((a) => a.lieu.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('garde chaque journée dans un même quartier', () => {
    const it_ = genererItineraire(entree())
    for (const j of it_.jours) {
      const quartiers = new Set(j.activites.map((a) => (a.lieu.lat > centre.lat + 0.05 ? 'nord' : 'sud')))
      expect(quartiers.size, j.titre).toBeLessThanOrEqual(1)
    }
  })

  it('respecte les exclusions et le filtre « gratuites uniquement »', () => {
    const it_ = genererItineraire(entree({}, { activitesExclues: ['musee'], gratuitesUniquement: true }))
    const activites = it_.jours.flatMap((j) => j.activites)
    expect(activites.some((a) => a.lieu.type === 'musee')).toBe(false)
    expect(activites.every((a) => a.prix === 0)).toBe(true)
    expect(it_.totalActivites).toBe(0)
  })

  it('aucun lieu trouvé : activités génériques, source « aucun »', () => {
    const it_ = genererItineraire(entree({}, {}, { lieux: [], source: 'aucun' }))
    const activites = it_.jours.flatMap((j) => j.activites)
    expect(it_.source).toBe('aucun')
    expect(activites.length).toBeGreaterThan(3)
    expect(activites.every((a) => a.lieu.source === 'generique')).toBe(true)
    expect(activites[0].lieu.nom).toMatch(/Annecy/)
  })

  it('compte les enfants à 70 % dans le prix des activités', () => {
    const musee: LieuVisite = { id: 'm', nom: 'Musée', type: 'musee', lat: centre.lat, lon: centre.lon, source: 'osm' }
    const prix = (s: Partial<ReglagesSimples>) => genererItineraire(entree({ ...s, nuits: 1 }, {}, { lieux: [musee] })).jours[0].activites[0].prix
    expect(prix({ adultes: 2, enfants: 1 })).toBeCloseTo(prix({ adultes: 2, enfants: 0 }) * 1.35)
  })

  it('remplace une activité par un lieu non utilisé', () => {
    const it_ = genererItineraire(entree())
    const j = it_.jours.findIndex((d) => d.activites.length > 1)
    const avant = it_.jours[j].activites[0].lieu.id
    const apres = remplacerActivite(it_, j, 0, entree())
    const nouveau = apres.jours[j].activites[0].lieu.id
    expect(nouveau).not.toBe(avant)
    expect(it_.jours.flatMap((d) => d.activites.map((a) => a.lieu.id))).not.toContain(nouveau)
  })

  it('activités génériques : nom de la ville, avec élision', () => {
    for (const g of activitesGeneriques('Lisbonne', centre)) expect(g.nom).toContain('Lisbonne')
    expect(activitesGeneriques('Annecy', centre)[0].nom).toBe('Balade dans le centre d’Annecy')
    expect(activitesGeneriques('Rome', centre)[0].nom).toBe('Balade dans le centre de Rome')
  })
})

describe('horaires', () => {
  it('place les couchers de soleil et les spectacles en soirée', () => {
    const it_ = genererItineraire(entree({ nuits: 8 }, { rythme: 3 }, { lieux: [], source: 'aucun' }))
    for (const a of it_.jours.flatMap((j) => j.activites)) {
      if (/Coucher|Soirée/.test(a.lieu.nom)) expect(a.moment, a.lieu.nom).toBe('soir')
    }
  })
})
