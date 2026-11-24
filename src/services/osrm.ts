import { tarifs } from '../data'
import type { Coordonnees, Trajet } from '../domain/types'
import { distanceKm } from '../engine/geo'
import { avecCache } from './cache'
import { lireJson } from './reseau'

/**
 * OSRM, serveur de démonstration public (usage léger : un appel par trajet, mis en cache).
 * https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server
 */
const URL_OSRM = 'https://router.project-osrm.org/route/v1/driving'

interface ReponseOsrm {
  code: string
  routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[]
}

/** Repli : vol d'oiseau × 1,25, à la vitesse moyenne d'un trajet en voiture. */
export function trajetAVolDOiseau(depart: Coordonnees, arrivee: Coordonnees): Trajet {
  const km = distanceKm(depart, arrivee) * tarifs.coefficientDetour
  return {
    distanceKm: km,
    dureeMin: (km / tarifs.voiture.vitesseMoyenneKmH) * 60,
    trace: [
      [depart.lat, depart.lon],
      [arrivee.lat, arrivee.lon],
    ],
    approximatif: true,
  }
}

/**
 * Estimations de repli récentes. Sans elles, la configuration (OSRM en panne → vol d'oiseau)
 * et le calcul final (OSRM revenu → vraie route) donnaient deux totaux différents pour le même voyage.
 * Gardées 5 minutes en mémoire seulement : plus tard, ou après un rechargement, on retente OSRM.
 */
const replis = new Map<string, { trajet: Trajet; le: number }>()
const DUREE_REPLI_MS = 5 * 60_000

/** Trajet routier ; si OSRM ne répond pas ou ne trouve pas de route (mer, autre continent), estimation à vol d'oiseau. */
export async function calculerTrajet(depart: Coordonnees, arrivee: Coordonnees, signal?: AbortSignal): Promise<Trajet> {
  const coordonnees = `${depart.lon.toFixed(5)},${depart.lat.toFixed(5)};${arrivee.lon.toFixed(5)},${arrivee.lat.toFixed(5)}`
  const repli = replis.get(coordonnees)
  if (repli && Date.now() - repli.le < DUREE_REPLI_MS) return repli.trajet
  try {
    return await avecCache(`osrm:${coordonnees}`, async () => {
      const r = await lireJson<ReponseOsrm>(`${URL_OSRM}/${coordonnees}?overview=simplified&geometries=geojson`, {
        service: 'OSRM',
        delaiMs: 10000,
        signal,
      })
      const route = r.routes?.[0]
      if (r.code !== 'Ok' || !route) throw new Error(`OSRM : ${r.code}`)
      return {
        distanceKm: route.distance / 1000,
        dureeMin: route.duration / 60,
        trace: route.geometry.coordinates.map(([lon, lat]) => [lat, lon] as [number, number]),
        approximatif: false,
      }
    })
  } catch (erreur) {
    if (signal?.aborted) throw erreur
    const trajet = trajetAVolDOiseau(depart, arrivee)
    replis.set(coordonnees, { trajet, le: Date.now() })
    return trajet
  }
}
