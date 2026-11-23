import { describe, expect, it } from 'vitest'
import { aeroports, villesDepart } from '../data'
import { aeroportLePlusProche, distanceKm, distanceTerrestreKm } from './geo'

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
    const troyes = villesDepart.find((v) => v.id === 'troyes')!
    const { aeroport, distanceKm } = aeroportLePlusProche(troyes, aeroports)
    expect(aeroport.code).toBe('PAR')
    expect(distanceKm).toBeGreaterThan(100)
    expect(distanceKm).toBeLessThan(170)
  })

  it('rattache Lyon à Lyon-Saint-Exupéry', () => {
    const lyon = villesDepart.find((v) => v.id === 'lyon')!
    expect(aeroportLePlusProche(lyon, aeroports).aeroport.code).toBe('LYS')
  })

  it('refuse une liste vide', () => {
    expect(() => aeroportLePlusProche(paris, [])).toThrow()
  })
})
