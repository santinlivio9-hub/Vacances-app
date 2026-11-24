export class ErreurService extends Error {
  constructor(
    readonly service: string,
    message: string,
  ) {
    super(`${service} : ${message}`)
    this.name = 'ErreurService'
  }
}

interface Options {
  service: string
  delaiMs?: number
  signal?: AbortSignal
  init?: RequestInit
}

/** GET/POST JSON avec délai maximal : une requête qui traîne est abandonnée pour passer au repli. */
export async function lireJson<T>(url: string, { service, delaiMs = 8000, signal, init }: Options): Promise<T> {
  const minuterie = AbortSignal.timeout(delaiMs)
  const combine = signal ? AbortSignal.any([signal, minuterie]) : minuterie
  let reponse: Response
  try {
    reponse = await fetch(url, { ...init, signal: combine })
  } catch (erreur) {
    if (signal?.aborted) throw erreur
    throw new ErreurService(service, minuterie.aborted ? 'délai dépassé' : 'service injoignable')
  }
  if (!reponse.ok) throw new ErreurService(service, `réponse HTTP ${reponse.status}`)
  try {
    return (await reponse.json()) as T
  } catch {
    throw new ErreurService(service, 'réponse illisible')
  }
}

/**
 * Espace les appels d'au moins `intervalleMs` (ex. Nominatim : 1 requête par seconde maximum).
 */
export function creerLimiteur(intervalleMs: number) {
  let prochain = 0
  return async function planifier<T>(tache: () => Promise<T>): Promise<T> {
    const maintenant = Date.now()
    const attente = Math.max(0, prochain - maintenant)
    prochain = Math.max(maintenant, prochain) + intervalleMs
    if (attente > 0) await new Promise((r) => setTimeout(r, attente))
    return tache()
  }
}

/** Exécute des tâches avec au plus `maximum` en parallèle. */
export async function enParallele<E, R>(elements: E[], maximum: number, tache: (e: E) => Promise<R>): Promise<R[]> {
  const resultats: R[] = new Array(elements.length)
  let suivant = 0
  async function travailleur() {
    while (suivant < elements.length) {
      const i = suivant++
      resultats[i] = await tache(elements[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(maximum, elements.length) }, travailleur))
  return resultats
}
