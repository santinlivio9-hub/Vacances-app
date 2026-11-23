import { decoderCommunes, type Commune } from '../engine/communes'

let chargement: Promise<Commune[]> | null = null

/** Charge la liste complète des communes (fichier séparé, téléchargé seulement au premier besoin). */
export function chargerCommunes(): Promise<Commune[]> {
  chargement ??= import('./communes.json')
    .then((module) => decoderCommunes(module.default))
    .catch((erreur: unknown) => {
      chargement = null
      throw erreur
    })
  return chargement
}
