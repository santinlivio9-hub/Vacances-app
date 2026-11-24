import { describe, expect, it } from 'vitest'
import { aeroports } from '../data'
import { aeroportLePlusProche, arcGrandCercle, distanceKm, distanceTerrestreKm } from './geo'

const paris = { lat: 48.8566, lon: 2.3522 }
const nice = { lat: 43.7102, lon: 7.262 }
const newYork = { lat: 40.7128, lon: -74.006 }

describe('distanceKm', () => {
  it('vaut 0 pour un même point', () => {
    expect(distanceKm(paris, paris)).toBe(0)
  })

  it('donne environ 686 km entre Paris et Nice', () => {
    expect(distanceKm(paris, nice)).toBeCloseTo(686, -1)
  })

  it('donne environ 5 840 km entre Paris et New York', () => {
    expect(distanceKm(paris, newYork)).toBeGreaterThan(5780)
    expect(distanceKm(paris, newYork)).toBeLessThan(5900)
  })

  it('est symétrique', () => {
    expect(distanceKm(paris, nice)).toBeCloseTo(distanceKm(nice, paris), 6)
  })
})

describe('distanceTerrestreKm', () => {
  it('applique le coefficient de détour', () => {
    expect(distanceTerrestreKm(paris, nice, 1.2)).toBeCloseTo(distanceKm(paris, nice) * 1.2, 6)
  })
})

describe('aeroportLePlusProche', () => {
  it('rattache Troyes à Paris', () => {
    const troyes = { lat: 48.2973, lon: 4.0744 }
    const { aeroport, distanceKm } = aeroportLePlusProche(troyes, aeroports)
    expect(aeroport.code).toBe('PAR')
    expect(distanceKm).toBeGreaterThan(100)
    expect(distanceKm).toBeLessThan(170)
  })

  it('rattache Lyon à Lyon-Saint-Exupéry', () => {
    const lyon = { lat: 45.764, lon: 4.8357 }
    expect(aeroportLePlusProche(lyon, aeroports).aeroport.code).toBe('LYS')
  })

  it('refuse une liste vide', () => {
    expect(() => aeroportLePlusProche(paris, [])).toThrow()
  })
})

describe('arcGrandCercle', () => {
  it('relie les deux points et passe plus au nord qu’une ligne droite (Paris → New York)', () => {
    const arc = arcGrandCercle(paris, newYork, 32)
    expect(arc).toHaveLength(33)
    expect(arc[0][0]).toBeCloseTo(paris.lat, 5)
    expect(arc.at(-1)![1]).toBeCloseTo(newYork.lon, 5)
    expect(Math.max(...arc.map(([lat]) => lat))).toBeGreaterThan(50)
  })

  it('ne saute pas d’un bord à l’autre de la carte au passage de l’antiméridien', () => {
    const arc = arcGrandCercle({ lat: 35.68, lon: 139.69 }, { lat: 37.77, lon: -122.42 }, 32)
    for (let i = 1; i < arc.length; i++) expect(Math.abs(arc[i][1] - arc[i - 1][1])).toBeLessThan(20)
  })
})
