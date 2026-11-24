/**
 * Prix du carburant utilisé par défaut. Au démarrage, l'app lit la moyenne nationale du jour
 * (API officielle des prix des carburants) ; sans réponse, on garde la dernière valeur relevée.
 */
export interface PrixCarburant {
  /** Prix retenu pour le calcul (€/L) : moyenne du gazole et du SP95-E10, les deux plus vendus */
  prix: number
  gazole: number
  sp95: number
  e10: number
  /** AAAA-MM-JJ */
  date: string
  source: 'direct' | 'repli'
}

/** Moyennes nationales relevées le 24/11/2026 sur l'API officielle. */
export const CARBURANT_REPLI: PrixCarburant = { prix: 2.04, gazole: 2.118, sp95: 2.025, e10: 1.954, date: '2026-11-24', source: 'repli' }

let courant: PrixCarburant = CARBURANT_REPLI

export const carburantActuel = () => courant

export function definirCarburant(p: Omit<PrixCarburant, 'prix'>): PrixCarburant {
  courant = { ...p, prix: Math.round(((p.gazole + p.e10) / 2) * 1000) / 1000 }
  return courant
}
