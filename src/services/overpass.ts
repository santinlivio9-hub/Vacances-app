import type { Coordonnees, LieuVisite, TypeActivite } from '../domain/types'
import { avecCache } from './cache'
import { lireJson } from './reseau'

/**
 * Overpass API (OpenStreetMap). Usage raisonnable : zone limitée autour de la destination,
 * nombre de résultats plafonné, un seul appel par destination (mis en cache).
 * https://wiki.openstreetmap.org/wiki/Overpass_API
 */
const URL_OVERPASS = 'https://overpass-api.de/api/interpreter'

interface ElementOverpass {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

/** Requête Overpass QL : lieux touristiques nommés dans un rayon donné. `notables` = seulement ceux liés à Wikipédia/Wikidata. */
export function requeteOverpass({ lat, lon }: Coordonnees, rayonM: number, notables: boolean, limite: number): string {
  const autour = `(around:${Math.round(rayonM)},${lat.toFixed(5)},${lon.toFixed(5)})`
  const filtre = notables ? '["wikidata"]' : ''
  const selecteurs = [
    '["tourism"~"^(attraction|museum|gallery|viewpoint|zoo|aquarium|theme_park)$"]',
    '["historic"~"^(monument|castle|memorial|ruins|archaeological_site|fort|palace|city_gate|manor|church)$"]',
    '["natural"~"^(beach|waterfall|peak|cave_entrance)$"]',
    '["leisure"~"^(park|garden|nature_reserve|water_park)$"]["wikidata"]',
    '["amenity"~"^(theatre|marketplace)$"]["wikidata"]',
  ]
  const lignes = selecteurs.map((s) => `  nwr${s}["name"]${filtre}${autour};`).join('\n')
  return `[out:json][timeout:25];\n(\n${lignes}\n);\nout center tags ${limite};`
}

export function typeDepuisTags(tags: Record<string, string>): TypeActivite {
  const { tourism, historic, natural, leisure, amenity } = tags
  if (tourism === 'museum' || tourism === 'gallery') return 'musee'
  if (tourism === 'zoo' || tourism === 'aquarium') return 'zoo'
  if (tourism === 'theme_park' || leisure === 'water_park') return 'parc_attractions'
  if (tourism === 'viewpoint' || natural === 'peak') return 'point_de_vue'
  if (natural === 'beach') return 'plage'
  if (natural || leisure === 'nature_reserve') return 'nature'
  if (leisure === 'park' || leisure === 'garden') return 'parc'
  if (amenity === 'theatre') return 'spectacle'
  if (amenity === 'marketplace') return 'marche'
  if (historic) return 'monument'
  return 'autre'
}

export function versLieuVisite(e: ElementOverpass): LieuVisite | null {
  const tags = e.tags ?? {}
  const lat = e.lat ?? e.center?.lat
  const lon = e.lon ?? e.center?.lon
  const nom = tags['name:fr'] ?? tags.name
  if (lat === undefined || lon === undefined || !nom) return null
  return {
    id: `osm-${e.type}-${e.id}`,
    nom,
    type: typeDepuisTags(tags),
    lat,
    lon,
    wikipedia: tags.wikipedia,
    wikidata: tags.wikidata,
    site: tags.website ?? tags['contact:website'],
    gratuit: tags.fee === 'no' ? true : tags.fee === 'yes' ? false : undefined,
    source: 'osm',
  }
}

/** Supprime les doublons (même nom, ou même élément Wikidata). */
export function dedoublonner(lieux: LieuVisite[]): LieuVisite[] {
  const vus = new Set<string>()
  return lieux.filter((l) => {
    const cles = [l.nom.toLowerCase(), l.wikidata].filter(Boolean) as string[]
    if (cles.some((c) => vus.has(c))) return false
    cles.forEach((c) => vus.add(c))
    return true
  })
}

async function interroger(requete: string, signal?: AbortSignal): Promise<LieuVisite[]> {
  const reponse = await lireJson<{ elements: ElementOverpass[] }>(URL_OVERPASS, {
    service: 'Overpass',
    delaiMs: 20000,
    signal,
    init: { method: 'POST', body: new URLSearchParams({ data: requete }) },
  })
  return reponse.elements.map(versLieuVisite).filter((l): l is LieuVisite => l !== null)
}

/**
 * Lieux à visiter : d'abord les lieux notables (liés à Wikipédia), et s'il y en a trop peu,
 * une seconde requête plus large.
 */
export async function lieuxOverpass(centre: Coordonnees, rayonKm: number, signal?: AbortSignal): Promise<LieuVisite[]> {
  const cle = `overpass:${centre.lat.toFixed(3)},${centre.lon.toFixed(3)},${rayonKm}`
  return avecCache(cle, async () => {
    const notables = await interroger(requeteOverpass(centre, rayonKm * 1000, true, 150), signal)
    if (notables.length >= 12) return dedoublonner(notables)
    const autres = await interroger(requeteOverpass(centre, rayonKm * 1000, false, 120), signal)
    return dedoublonner([...notables, ...autres])
  })
}
