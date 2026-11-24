import { villes, type Ville } from '../data'
import type { Coordonnees } from '../domain/types'
import { distanceKm } from './geo'

/** Ville connue la plus proche, à moins de 25 km (sinon null : on prend la moyenne du pays). */
export function villeProche(p: Coordonnees): Ville | null {
  let meilleure: Ville | null = null
  let d = 25
  for (const v of villes) {
    const dv = distanceKm(p, v)
    if (dv < d) {
      d = dv
      meilleure = v
    }
  }
  return meilleure
}
