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

/**
 * Arc de grand cercle entre deux points (pour les trajets en avion), en `n` segments.
 * Les longitudes sont « dépliées » pour que la ligne ne traverse pas toute la carte
 * quand elle passe l'antiméridien.
 */
export function arcGrandCercle(a: Coordonnees, b: Coordonnees, n = 64): [number, number][] {
  const φ1 = enRadians(a.lat)
  const λ1 = enRadians(a.lon)
  const φ2 = enRadians(b.lat)
  const λ2 = enRadians(b.lon)
  const d = distanceKm(a, b) / RAYON_TERRE_KM
  if (d < 1e-9) return [[a.lat, a.lon]]
  const points: [number, number][] = []
  let lonPrecedente = a.lon
  for (let i = 0; i <= n; i++) {
    const f = i / n
    const A = Math.sin((1 - f) * d) / Math.sin(d)
    const B = Math.sin(f * d) / Math.sin(d)
    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2)
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2)
    const z = A * Math.sin(φ1) + B * Math.sin(φ2)
    const lat = (Math.atan2(z, Math.hypot(x, y)) * 180) / Math.PI
    let lon = (Math.atan2(y, x) * 180) / Math.PI
    while (lon - lonPrecedente > 180) lon -= 360
    while (lon - lonPrecedente < -180) lon += 360
    lonPrecedente = lon
    points.push([lat, lon])
  }
  return points
}
