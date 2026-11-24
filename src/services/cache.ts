/**
 * Cache des réponses réseau : sessionStorage (survit au rechargement de l'onglet),
 * avec repli en mémoire si le stockage est indisponible ou plein.
 */
const PREFIXE = 'bv-cache:'
const memoire = new Map<string, unknown>()
const enCours = new Map<string, Promise<unknown>>()

function stockage(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  } catch {
    return null
  }
}

export function lireCache<T>(cle: string): T | undefined {
  if (memoire.has(cle)) return memoire.get(cle) as T
  try {
    const brut = stockage()?.getItem(PREFIXE + cle)
    if (brut != null) {
      const valeur = JSON.parse(brut) as T
      memoire.set(cle, valeur)
      return valeur
    }
  } catch {
    /* cache illisible : on l'ignore */
  }
  return undefined
}

export function ecrireCache(cle: string, valeur: unknown): void {
  memoire.set(cle, valeur)
  try {
    stockage()?.setItem(PREFIXE + cle, JSON.stringify(valeur))
  } catch {
    /* stockage plein ou bloqué : le cache mémoire suffit */
  }
}

/**
 * Renvoie la valeur en cache, sinon exécute `charger` une seule fois (les appels
 * simultanés pour la même clé partagent la même requête). Les échecs ne sont pas mis en cache.
 */
export async function avecCache<T>(cle: string, charger: () => Promise<T>): Promise<T> {
  const enCache = lireCache<T>(cle)
  if (enCache !== undefined) return enCache
  const existante = enCours.get(cle)
  if (existante) return existante as Promise<T>
  const promesse = charger()
    .then((valeur) => {
      ecrireCache(cle, valeur)
      return valeur
    })
    .finally(() => enCours.delete(cle))
  enCours.set(cle, promesse)
  return promesse
}

/** Pour les tests. */
export function viderCache(): void {
  memoire.clear()
  enCours.clear()
  const s = stockage()
  if (!s) return
  for (let i = s.length - 1; i >= 0; i--) {
    const cle = s.key(i)
    if (cle?.startsWith(PREFIXE)) s.removeItem(cle)
  }
}
