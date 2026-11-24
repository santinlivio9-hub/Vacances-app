import { describe, expect, it } from 'vitest'
import { calculerItineraire, itineraireDepuisTrajet } from './itineraire'

const troyes = { lat: 48.2973, lon: 4.0744 }
const annecy = { lat: 45.8992, lon: 6.1294 }
const lisbonne = { lat: 38.72, lon: -9.14 }
const newYork = { lat: 40.71, lon: -74 }

describe('itinéraire affiché sur la carte', () => {
  it('garde la route OSRM et conseille le train pour Troyes → Annecy', () => {
    const it_ = itineraireDepuisTrajet(troyes, annecy, { distanceKm: 430, dureeMin: 250, trace: [[48.3, 4.07], [45.9, 6.13]], approximatif: false })
    expect(it_).toMatchObject({ genre: 'route', mode: 'train', dureeMin: 250, routeTerrestre: true })
  })

  it('trace un arc d’avion sans appeler OSRM pour un long trajet', async () => {
    const vol = await calculerItineraire(troyes, newYork)
    expect(vol.genre).toBe('vol')
    expect(vol.mode).toBe('avion')
    expect(vol.trace.length).toBeGreaterThan(10)
    expect(vol.dureeMin).toBeGreaterThan(8 * 60)
  })

  it('bascule sur l’avion si la route estimée est trop longue (Paris → Lisbonne sans OSRM)', () => {
    const it_ = itineraireDepuisTrajet({ lat: 48.86, lon: 2.35 }, lisbonne, { distanceKm: 1810, dureeMin: 1280, trace: [], approximatif: true })
    expect(it_.genre).toBe('vol')
    expect(it_.routeTerrestre).toBe(true) // la voiture reste possible
    expect(it_.distanceRouteKm).toBe(1810)
  })

  it('affiche une estimation en ligne droite si OSRM est en panne pour un trajet court', () => {
    const it_ = itineraireDepuisTrajet(troyes, annecy, { distanceKm: 375, dureeMin: 265, trace: [[48.3, 4.07], [45.9, 6.13]], approximatif: true })
    expect(it_).toMatchObject({ genre: 'estimation', mode: 'train' })
  })
})
