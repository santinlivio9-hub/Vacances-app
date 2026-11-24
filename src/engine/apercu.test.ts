import { describe, expect, it } from 'vitest'
import { tousLesPays } from '../data'
import { apercuPrix, prixAvionAllerSimple, saisonDuMois, transportLeMoinsCher } from './apercu'

const annecy = { lat: 45.9, lon: 6.13, pays: 'fr' }
const lisbonne = { lat: 38.72, lon: -9.14, pays: 'pt' }

describe('saisonDuMois', () => {
  it('lit la haute et la basse saison du pays', () => {
    expect(saisonDuMois(tousLesPays.fr, 8)).toBe('haute')
    expect(saisonDuMois(tousLesPays.fr, 2)).toBe('basse')
    expect(saisonDuMois(tousLesPays.fr, 5)).toBe('moyenne')
  })
})

describe('prixAvionAllerSimple', () => {
  it('applique des tranches dégressives', () => {
    expect(prixAvionAllerSimple(1000)).toBeCloseTo(45 + 70)
    expect(prixAvionAllerSimple(2000)).toBeCloseTo(45 + 70 + 35)
    expect(prixAvionAllerSimple(6000)).toBeCloseTo(45 + 70 + 70 + 120)
  })

  it('coûte plus cher en haute saison', () => {
    expect(prixAvionAllerSimple(1500, 'haute')).toBeGreaterThan(prixAvionAllerSimple(1500, 'basse'))
  })
})

describe('transportLeMoinsCher', () => {
  it('écarte l’avion pour un trajet court et les modes terrestres sans route', () => {
    expect(transportLeMoinsCher(150, 190, true, 'moyenne').mode).not.toBe('avion')
    expect(transportLeMoinsCher(5800, 7250, false, 'moyenne').mode).toBe('avion')
  })

  it('propose toujours quelque chose, même pour une île toute proche', () => {
    expect(transportLeMoinsCher(120, 150, false, 'moyenne').mode).toBe('avion')
  })
})

describe('apercuPrix', () => {
  it('donne un prix plausible pour une semaine à Annecy depuis Troyes', () => {
    const a = apercuPrix({ arrivee: annecy, distanceVolKm: 300, distanceRouteKm: 430, routeTerrestre: true, nuits: 7, mois: 5 })
    expect(a.parPersonne).toBeGreaterThan(250)
    expect(a.parPersonne).toBeLessThan(700)
    expect(a.parPersonne % 10).toBe(0)
  })

  it('est plus cher l’été qu’en hiver', () => {
    const base = { arrivee: lisbonne, distanceVolKm: 1450, distanceRouteKm: 1800, routeTerrestre: true, nuits: 7 }
    expect(apercuPrix({ ...base, mois: 8 }).parPersonne).toBeGreaterThan(apercuPrix({ ...base, mois: 2 }).parPersonne)
  })

  it('se rabat sur le continent pour un pays inconnu', () => {
    const a = apercuPrix({ arrivee: { lat: -16.5, lon: -68.15, pays: 'bo' }, distanceVolKm: 9800, distanceRouteKm: 12250, routeTerrestre: false, nuits: 1, mois: 6 })
    expect(a.estimationContinent).toBe(true)
    expect(a.mode).toBe('avion')
  })
})
