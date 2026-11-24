import { tarifs } from '../data'
import type { Coordonnees, ModeTransport, Trajet } from '../domain/types'
import { arcGrandCercle, distanceKm } from '../engine/geo'
import { modeConseille } from '../engine/reglages'
import { calculerTrajet } from '../services/osrm'
import type { DonneesTrajet } from '../engine/transport'

/** Au-delà, on ne demande pas de route à OSRM : on trace un arc d'avion. */
export const SEUIL_ROUTE_KM = 1500

export interface ItineraireCarte {
  /** route : tracé routier OSRM ; estimation : ligne droite (service indisponible) ; vol : arc en pointillés */
  genre: 'route' | 'estimation' | 'vol'
  trace: [number, number][]
  distanceVolKm: number
  /** Distance par la route (réelle ou estimée) */
  distanceRouteKm: number
  routeTerrestre: boolean
  /** Durée affichée : en voiture pour une route, en avion (aéroports compris) pour un vol */
  dureeMin: number
  /** Durée en voiture donnée par OSRM (route réelle uniquement) */
  dureeRouteMin?: number
  mode: ModeTransport
}

export function dureeAvionMin(distanceVolKm: number): number {
  return (distanceVolKm / tarifs.avion.vitesseCroisiereKmH) * 60 + tarifs.avion.tempsAeroportMin
}

export function itineraireDeVol(depart: Coordonnees, arrivee: Coordonnees): ItineraireCarte {
  const vol = distanceKm(depart, arrivee)
  return {
    genre: 'vol',
    trace: arcGrandCercle(depart, arrivee),
    distanceVolKm: vol,
    distanceRouteKm: vol * tarifs.coefficientDetour,
    routeTerrestre: false,
    dureeMin: dureeAvionMin(vol),
    mode: 'avion',
  }
}

/** Combine la distance à vol d'oiseau et la réponse d'OSRM (ou son repli) en un itinéraire à afficher. */
export function itineraireDepuisTrajet(depart: Coordonnees, arrivee: Coordonnees, trajet: Trajet): ItineraireCarte {
  const vol = distanceKm(depart, arrivee)
  if (!trajet.approximatif) {
    const mode = modeConseille(trajet.distanceKm, true)
    return {
      genre: 'route',
      trace: trajet.trace,
      distanceVolKm: vol,
      distanceRouteKm: trajet.distanceKm,
      routeTerrestre: true,
      dureeMin: mode === 'avion' ? dureeAvionMin(vol) : trajet.dureeMin,
      dureeRouteMin: trajet.dureeMin,
      mode,
    }
  }
  // Pas de route connue : service en panne, ou mer à traverser. On reste prudent.
  // On suppose qu'une route existe (on ne sait pas la vérifier) : voiture et train restent proposés.
  const mode = modeConseille(trajet.distanceKm, true)
  if (mode === 'avion') return { ...itineraireDeVol(depart, arrivee), distanceRouteKm: trajet.distanceKm, routeTerrestre: true }
  return {
    genre: 'estimation',
    trace: trajet.trace,
    distanceVolKm: vol,
    distanceRouteKm: trajet.distanceKm,
    routeTerrestre: true,
    dureeMin: trajet.dureeMin,
    mode,
  }
}

export async function calculerItineraire(depart: Coordonnees, arrivee: Coordonnees, signal?: AbortSignal): Promise<ItineraireCarte> {
  if (distanceKm(depart, arrivee) > SEUIL_ROUTE_KM) return itineraireDeVol(depart, arrivee)
  return itineraireDepuisTrajet(depart, arrivee, await calculerTrajet(depart, arrivee, signal))
}

/** Données de trajet pour le moteur de calcul. */
export function versDonneesTrajet(depart: Coordonnees & { nom?: string }, arrivee: Coordonnees & { nom?: string }, it: ItineraireCarte): DonneesTrajet {
  return {
    ...(depart.nom && arrivee.nom ? { noms: [depart.nom, arrivee.nom] as [string, string] } : {}),
    depart: { lat: depart.lat, lon: depart.lon },
    arrivee: { lat: arrivee.lat, lon: arrivee.lon },
    distanceVolKm: it.distanceVolKm,
    distanceRouteKm: it.distanceRouteKm,
    dureeRouteMin: it.dureeRouteMin,
    routeTerrestre: it.routeTerrestre,
  }
}

/** En attendant la réponse d'OSRM : estimation immédiate à vol d'oiseau. */
export function itineraireProvisoire(depart: Coordonnees, arrivee: Coordonnees): ItineraireCarte {
  const vol = distanceKm(depart, arrivee)
  if (vol > SEUIL_ROUTE_KM) return itineraireDeVol(depart, arrivee)
  return itineraireDepuisTrajet(depart, arrivee, {
    distanceKm: vol * tarifs.coefficientDetour,
    dureeMin: ((vol * tarifs.coefficientDetour) / tarifs.voiture.vitesseMoyenneKmH) * 60,
    trace: [],
    approximatif: true,
  })
}
