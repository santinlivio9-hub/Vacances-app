import type { Coordonnees } from '../domain/types'

export type ErreurPosition = 'indisponible' | 'refusee' | 'delai'

/** Position de l'appareil ; rejette avec un code simple à traduire en message clair. */
export function maPosition(delaiMs = 10000): Promise<Coordonnees> {
  return new Promise((resoudre, rejeter) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      rejeter('indisponible' satisfies ErreurPosition)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resoudre({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (e) => rejeter((e.code === e.PERMISSION_DENIED ? 'refusee' : e.code === e.TIMEOUT ? 'delai' : 'indisponible') satisfies ErreurPosition),
      { enableHighAccuracy: false, timeout: delaiMs, maximumAge: 5 * 60_000 },
    )
  })
}

export const MESSAGES_POSITION: Record<ErreurPosition, string> = {
  indisponible: 'La localisation n’est pas disponible sur cet appareil. Saisissez votre ville de départ.',
  refusee: 'Vous avez refusé la localisation. Saisissez votre ville de départ, ou autorisez-la dans les réglages du navigateur.',
  delai: 'La localisation met trop de temps. Saisissez votre ville de départ.',
}
