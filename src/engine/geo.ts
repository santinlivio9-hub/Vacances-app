import type { Aeroport } from '../data'
import type { Coordonnees } from '../domain/types'

const RAYON_TERRE_KM = 6371

const enRadians = (degres: number) => (degres * Math.PI) / 180

/** Distance à vol d'oiseau (formule de haversine), en km. */
export function distanceKm(a: Coordonnees, b: Coordonnees): number {
  const dLat = enRadians(b.lat - a.lat)
  const dLon = enRadians(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(enRadians(a.lat)) * Math.cos(enRadians(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * RAYON_TERRE_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Distance par la route ou le rail : vol d'oiseau × coefficient de détour. */
export function distanceTerrestreKm(a: Coordonnees, b: Coordonnees, coefficientDetour: number): number {
  return distanceKm(a, b) * coefficientDetour
}

export function aeroportLePlusProche(point: Coordonnees, aeroports: Aeroport[]): { aeroport: Aeroport; distanceKm: number } {
  if (aeroports.length === 0) throw new Error('Aucun aéroport fourni')
  let meilleur = { aeroport: aeroports[0], distanceKm: distanceKm(point, aeroports[0]) }
  for (const aeroport of aeroports.slice(1)) {
    const distance = distanceKm(point, aeroport)
    if (distance < meilleur.distanceKm) meilleur = { aeroport, distanceKm: distance }
  }
  return meilleur
}
