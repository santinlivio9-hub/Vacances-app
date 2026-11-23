import { aeroports, tarifsTransport } from '../data'
import type { Aeroport, TarifsTransport } from '../data/types'

/** Données de référence utilisées par le moteur ; remplaçables dans les tests. */
export interface ContexteCalcul {
  tarifs: TarifsTransport
  aeroports: Aeroport[]
}

export const CONTEXTE_PAR_DEFAUT: ContexteCalcul = { tarifs: tarifsTransport, aeroports }
