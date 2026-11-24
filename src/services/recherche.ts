import { chargerCommunes } from '../data/communes'
import type { Coordonnees, Lieu } from '../domain/types'
import { rechercherCommunes } from '../engine/communes'
import { rechercherNominatim } from './nominatim'
import { rechercherPhoton } from './photon'

export interface ResultatRecherche {
  lieux: Lieu[]
  source: 'photon' | 'communes' | 'nominatim' | 'aucun'
}

/** Communes françaises embarquées dans l'app : fonctionne même hors ligne. */
export async function rechercherCommunesLocales(texte: string, limite = 6): Promise<Lieu[]> {
  const communes = await chargerCommunes()
  return rechercherCommunes(communes, texte, limite).map((c) => ({
    nom: c.nom,
    detail: `${c.codesPostaux[0]}, France`,
    lat: c.lat,
    lon: c.lon,
    pays: 'fr',
    codePostal: c.codesPostaux[0],
    type: 'city',
  }))
}

/**
 * Autocomplétion : Photon ; s'il ne répond pas, les communes françaises embarquées.
 * Nominatim n'est sollicité que si `valide` est vrai (l'utilisateur a validé sa saisie),
 * car ses règles interdisent l'autocomplétion.
 */
export async function rechercherLieux(
  texte: string,
  { proximite, valide = false, signal }: { proximite?: Coordonnees; valide?: boolean; signal?: AbortSignal } = {},
): Promise<ResultatRecherche> {
  if (texte.trim().length < 2) return { lieux: [], source: 'aucun' }
  try {
    const lieux = await rechercherPhoton(texte, proximite, signal)
    if (lieux.length > 0 || !valide) return { lieux, source: 'photon' }
  } catch (erreur) {
    if (signal?.aborted) throw erreur
  }
  try {
    const lieux = await rechercherCommunesLocales(texte)
    if (lieux.length > 0) return { lieux, source: 'communes' }
  } catch {
    /* liste des communes non chargée : on continue */
  }
  if (valide) {
    try {
      const lieux = await rechercherNominatim(texte, signal)
      if (lieux.length > 0) return { lieux, source: 'nominatim' }
    } catch (erreur) {
      if (signal?.aborted) throw erreur
    }
  }
  return { lieux: [], source: 'aucun' }
}
