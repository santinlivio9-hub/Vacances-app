import type { Coordonnees, LieuVisite } from '../domain/types'
import { lieuxOverpass } from './overpass'
import { lieuxWikipedia } from './wikipedia'

export interface ResultatLieux {
  lieux: LieuVisite[]
  /** D'où viennent les lieux ; « aucun » = le moteur proposera des activités génériques */
  source: 'osm' | 'wikipedia' | 'aucun'
}

const MINIMUM_UTILE = 6

/** Lieux à visiter autour de la destination : OpenStreetMap, sinon Wikipédia, sinon rien. */
export async function trouverLieux(centre: Coordonnees, rayonKm = 12, signal?: AbortSignal): Promise<ResultatLieux> {
  try {
    const lieux = await lieuxOverpass(centre, rayonKm, signal)
    if (lieux.length >= MINIMUM_UTILE) return { lieux, source: 'osm' }
  } catch (erreur) {
    if (signal?.aborted) throw erreur
  }
  try {
    const lieux = await lieuxWikipedia(centre, Math.min(rayonKm, 10), signal)
    if (lieux.length > 0) return { lieux, source: 'wikipedia' }
  } catch (erreur) {
    if (signal?.aborted) throw erreur
  }
  return { lieux: [], source: 'aucun' }
}
