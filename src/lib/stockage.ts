/** Sous-ensemble de l'API localStorage, remplaçable dans les tests. */
export interface Stockage {
  getItem(cle: string): string | null
  setItem(cle: string, valeur: string): void
  removeItem(cle: string): void
}

export interface SimulationSauvegardee {
  id: string
  nom: string
  /** Date ISO de la sauvegarde */
  creeLe: string
  /** Paramètres du simulateur, au format de l'URL */
  parametres: string
}

const CLE_SIMULATIONS = 'budget-voyage:simulations:v1'
const CLE_CHECKLISTS = 'budget-voyage:checklists:v1'
export const MAX_SIMULATIONS = 30

/** localStorage s'il est utilisable (il peut être bloqué : navigation privée, réglages…), sinon null. */
export function stockageNavigateur(): Stockage | null {
  try {
    const stockage = window.localStorage
    const test = '__budget-voyage__'
    stockage.setItem(test, test)
    stockage.removeItem(test)
    return stockage
  } catch {
    return null
  }
}

function lireJson<T>(stockage: Stockage | null, cle: string, defaut: T): T {
  if (!stockage) return defaut
  try {
    const brut = stockage.getItem(cle)
    return brut ? (JSON.parse(brut) as T) : defaut
  } catch {
    return defaut
  }
}

function ecrireJson(stockage: Stockage | null, cle: string, valeur: unknown): boolean {
  if (!stockage) return false
  try {
    stockage.setItem(cle, JSON.stringify(valeur))
    return true
  } catch {
    return false
  }
}

const estSimulation = (s: unknown): s is SimulationSauvegardee =>
  typeof s === 'object' &&
  s !== null &&
  ['id', 'nom', 'creeLe', 'parametres'].every((cle) => typeof (s as Record<string, unknown>)[cle] === 'string')

export function lireSimulations(stockage = stockageNavigateur()): SimulationSauvegardee[] {
  const liste = lireJson<unknown>(stockage, CLE_SIMULATIONS, [])
  return Array.isArray(liste) ? liste.filter(estSimulation) : []
}

/**
 * Sauvegarde une simulation (la plus récente en premier). Une simulation identique déjà
 * sauvegardée est remplacée plutôt que dupliquée. Renvoie null si le stockage est indisponible.
 */
export function sauvegarderSimulation(
  entree: Pick<SimulationSauvegardee, 'nom' | 'parametres'>,
  stockage = stockageNavigateur(),
  maintenant = new Date(),
): SimulationSauvegardee | null {
  const nouvelle: SimulationSauvegardee = {
    id: `${maintenant.getTime().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    creeLe: maintenant.toISOString(),
    ...entree,
  }
  const autres = lireSimulations(stockage).filter((s) => s.parametres !== entree.parametres)
  return ecrireJson(stockage, CLE_SIMULATIONS, [nouvelle, ...autres].slice(0, MAX_SIMULATIONS)) ? nouvelle : null
}

export function supprimerSimulation(id: string, stockage = stockageNavigateur()): boolean {
  return ecrireJson(
    stockage,
    CLE_SIMULATIONS,
    lireSimulations(stockage).filter((s) => s.id !== id),
  )
}

export function lireChecklist(cle: string, stockage = stockageNavigateur()): string[] {
  const toutes = lireJson<Record<string, unknown>>(stockage, CLE_CHECKLISTS, {})
  const coches = toutes[cle]
  return Array.isArray(coches) ? coches.filter((c): c is string => typeof c === 'string') : []
}

export function ecrireChecklist(cle: string, coches: string[], stockage = stockageNavigateur()): boolean {
  const toutes = lireJson<Record<string, string[]>>(stockage, CLE_CHECKLISTS, {})
  return ecrireJson(stockage, CLE_CHECKLISTS, { ...toutes, [cle]: coches })
}
