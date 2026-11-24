import type { TypeLogement } from '../domain/types'

/** Ce que le moteur sait de chaque type de logement (libellés, cuisine, confort de référence). */
export interface InfoLogement {
  nom: string
  /** Pour les titres : « Version Airbnb » */
  version: string
  /** Une cuisine permet de faire ses courses plutôt que de manger dehors */
  cuisine: boolean
  /** Confort de référence sur 10 (style Équilibré) */
  confort: number
  /** Proposé pour les séjours courts / au mois */
  court: boolean
  long: boolean
}

export const LOGEMENTS: Record<TypeLogement, InfoLogement> = {
  hotel: { nom: 'Hôtel', version: 'Version hôtel', cuisine: false, confort: 7, court: true, long: false },
  appartement: { nom: 'Airbnb / appartement', version: 'Version Airbnb', cuisine: true, confort: 7.5, court: true, long: true },
  habitant: { nom: 'Chez l’habitant', version: 'Version chez l’habitant', cuisine: true, confort: 5.5, court: true, long: true },
  auberge: { nom: 'Auberge de jeunesse', version: 'Version auberge', cuisine: true, confort: 4, court: true, long: false },
  camping: { nom: 'Camping', version: 'Version camping', cuisine: true, confort: 3.5, court: true, long: false },
  gite: { nom: 'Gîte', version: 'Version gîte', cuisine: true, confort: 7, court: true, long: false },
  studio: { nom: 'Studio meublé', version: 'Version studio', cuisine: true, confort: 7.5, court: false, long: true },
  colocation: { nom: 'Colocation', version: 'Version colocation', cuisine: true, confort: 5.5, court: false, long: true },
  residence: { nom: 'Résidence étudiante / jeunes actifs', version: 'Version résidence', cuisine: true, confort: 6, court: false, long: true },
}

export const LOGEMENTS_COURTS = (Object.keys(LOGEMENTS) as TypeLogement[]).filter((t) => LOGEMENTS[t].court)
export const LOGEMENTS_LONGS = (Object.keys(LOGEMENTS) as TypeLogement[]).filter((t) => LOGEMENTS[t].long)
export const estTypeLogement = (t: unknown): t is TypeLogement => typeof t === 'string' && t in LOGEMENTS
