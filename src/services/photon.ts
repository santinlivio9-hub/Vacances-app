import type { Coordonnees, Lieu } from '../domain/types'
import { avecCache } from './cache'
import { lireJson } from './reseau'

/**
 * Photon (komoot) : géocodage OpenStreetMap conçu pour l'autocomplétion.
 * Usage gratuit raisonnable, sans clé ; on débounce la saisie (300 ms) et on met en cache.
 * https://photon.komoot.io
 */
const URL_PHOTON = 'https://photon.komoot.io/api/'

interface ProprietesPhoton {
  name?: string
  street?: string
  housenumber?: string
  postcode?: string
  city?: string
  county?: string
  state?: string
  country?: string
  countrycode?: string
  type?: string
  osm_value?: string
}

interface ReponsePhoton {
  features: { geometry: { coordinates: [number, number] }; properties: ProprietesPhoton }[]
}

const uniques = (valeurs: (string | undefined)[]) => [...new Set(valeurs.filter((v): v is string => !!v && v.trim() !== ''))]

export function versLieu(p: ProprietesPhoton, [lon, lat]: [number, number]): Lieu {
  const rue = p.street ? [p.housenumber, p.street].filter(Boolean).join(' ') : undefined
  const nom = p.name ?? rue ?? p.city ?? p.state ?? 'Lieu sans nom'
  const detail = uniques([p.name ? rue : undefined, p.city, p.state, p.country])
    .filter((v) => v !== nom)
    .join(', ')
  return {
    nom,
    detail,
    lat,
    lon,
    pays: p.countrycode?.toLowerCase(),
    codePostal: p.postcode,
    type: p.type ?? p.osm_value,
  }
}

const TYPES_LOCALITE = new Set(['city', 'town', 'village', 'locality', 'district', 'county', 'state', 'country', 'region', 'island'])

/**
 * On cherche surtout des destinations : villes, régions et pays passent devant les commerces
 * et les rues homonymes (« New York » ne doit pas proposer d'abord un café parisien).
 * Le tri est stable : l'ordre de pertinence de Photon est conservé à l'intérieur de chaque groupe.
 */
export function classerLieux(lieux: Lieu[]): Lieu[] {
  const rang = (l: Lieu) => (l.type && TYPES_LOCALITE.has(l.type) ? 0 : l.type === 'street' ? 1 : 2)
  return lieux.map((l, i) => ({ l, i })).sort((a, b) => rang(a.l) - rang(b.l) || a.i - b.i).map(({ l }) => l)
}

export async function rechercherPhoton(texte: string, proximite?: Coordonnees, signal?: AbortSignal): Promise<Lieu[]> {
  const params = new URLSearchParams({ q: texte.trim(), limit: '10', lang: 'fr' })
  if (proximite) {
    params.set('lat', proximite.lat.toFixed(3))
    params.set('lon', proximite.lon.toFixed(3))
  }
  return avecCache(`photon:${params}`, async () => {
    const reponse = await lireJson<ReponsePhoton>(`${URL_PHOTON}?${params}`, { service: 'Photon', delaiMs: 5000, signal })
    return classerLieux(reponse.features.map((f) => versLieu(f.properties, f.geometry.coordinates))).slice(0, 6)
  })
}
