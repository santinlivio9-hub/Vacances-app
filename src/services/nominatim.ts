import type { Coordonnees, Lieu } from '../domain/types'
import { avecCache } from './cache'
import { creerLimiteur, lireJson } from './reseau'

/**
 * Nominatim (OpenStreetMap). Règles d'usage : 1 requête par seconde au maximum,
 * pas d'autocomplétion, résultats mis en cache.
 * https://operations.osmfoundation.org/policies/nominatim/
 */
const URL_NOMINATIM = 'https://nominatim.openstreetmap.org'
const planifier = creerLimiteur(1100)

interface AdresseNominatim {
  city?: string
  town?: string
  village?: string
  municipality?: string
  hamlet?: string
  suburb?: string
  road?: string
  house_number?: string
  state?: string
  country?: string
  country_code?: string
  postcode?: string
}

interface ResultatNominatim {
  lat: string
  lon: string
  name?: string
  display_name: string
  type?: string
  address?: AdresseNominatim
}

export function versLieu(r: ResultatNominatim): Lieu {
  const a = r.address ?? {}
  const ville = a.city ?? a.town ?? a.village ?? a.municipality ?? a.hamlet
  const rue = a.road ? [a.house_number, a.road].filter(Boolean).join(' ') : undefined
  const nom = r.name || ville || rue || r.display_name.split(',')[0]
  const detail = [...new Set([ville, a.state, a.country].filter((v): v is string => !!v && v !== nom))].join(', ')
  return {
    nom,
    detail,
    lat: Number(r.lat),
    lon: Number(r.lon),
    pays: a.country_code?.toLowerCase(),
    codePostal: a.postcode,
    type: r.type,
  }
}

/** Texte de secours quand aucun service ne connaît le point : « 48,297° N, 4,074° E ». */
export function coordonneesEnTexte({ lat, lon }: Coordonnees): string {
  const f = (v: number) => Math.abs(v).toLocaleString('fr-FR', { maximumFractionDigits: 3 })
  return `${f(lat)}° ${lat >= 0 ? 'N' : 'S'}, ${f(lon)}° ${lon >= 0 ? 'E' : 'O'}`
}

/** Adresse d'un point cliqué sur la carte (niveau ville par défaut). */
export async function adresseDuPoint(point: Coordonnees, signal?: AbortSignal): Promise<Lieu> {
  const params = new URLSearchParams({
    lat: point.lat.toFixed(5),
    lon: point.lon.toFixed(5),
    format: 'jsonv2',
    zoom: '14',
    addressdetails: '1',
    'accept-language': 'fr',
  })
  return avecCache(`nominatim-reverse:${params}`, () =>
    planifier(async () => {
      const r = await lireJson<ResultatNominatim & { error?: string }>(`${URL_NOMINATIM}/reverse?${params}`, {
        service: 'Nominatim',
        signal,
      })
      if (r.error) throw new Error(r.error)
      return versLieu(r)
    }),
  )
}

/** Recherche classique (pas d'autocomplétion) : utilisée en secours, après validation de la saisie. */
export async function rechercherNominatim(texte: string, signal?: AbortSignal): Promise<Lieu[]> {
  const params = new URLSearchParams({ q: texte.trim(), format: 'jsonv2', addressdetails: '1', limit: '5', 'accept-language': 'fr' })
  return avecCache(`nominatim-search:${params}`, () =>
    planifier(async () => {
      const r = await lireJson<ResultatNominatim[]>(`${URL_NOMINATIM}/search?${params}`, { service: 'Nominatim', signal })
      return r.map(versLieu)
    }),
  )
}
