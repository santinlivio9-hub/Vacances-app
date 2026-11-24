import type { Favori } from '../store/favoris'
import type { VoyageSauvegarde } from '../store/voyage'

/**
 * Fusion des données de l'appareil et du compte : union par identifiant ;
 * en cas de conflit, la version modifiée le plus récemment l'emporte.
 */
export function fusionnerVoyages(locaux: VoyageSauvegarde[], distants: VoyageSauvegarde[]): VoyageSauvegarde[] {
  const parId = new Map<string, VoyageSauvegarde>()
  for (const v of [...distants, ...locaux]) {
    const existant = parId.get(v.id)
    if (!existant || (v.majLe ?? v.creeLe) > (existant.majLe ?? existant.creeLe)) parId.set(v.id, v)
  }
  return [...parId.values()].sort((a, b) => (b.majLe ?? b.creeLe).localeCompare(a.majLe ?? a.creeLe))
}

export function fusionnerFavoris(locaux: Favori[], distants: Favori[]): Favori[] {
  const parId = new Map<string, Favori>()
  for (const f of [...distants, ...locaux]) if (!parId.has(f.id)) parId.set(f.id, f)
  return [...parId.values()].sort((a, b) => b.ajouteLe.localeCompare(a.ajouteLe))
}

/** Ce qu'il faut envoyer au compte après une modification locale. */
export function differences<T extends { id: string }>(avant: Map<string, string>, apres: T[], version: (x: T) => string): { aEnvoyer: T[]; aSupprimer: string[] } {
  const ids = new Set(apres.map((x) => x.id))
  return {
    aEnvoyer: apres.filter((x) => avant.get(x.id) !== version(x)),
    aSupprimer: [...avant.keys()].filter((id) => !ids.has(id)),
  }
}

/** Empreinte de ce qui est déjà synchronisé (id → version). */
export const empreinte = <T extends { id: string }>(liste: T[], version: (x: T) => string) => new Map(liste.map((x) => [x.id, version(x)]))
export const versionVoyage = (v: VoyageSauvegarde) => `${v.majLe}|${v.nom}|${v.total ?? ''}`
export const versionFavori = (f: Favori) => f.ajouteLe
