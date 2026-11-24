import type { ReglagesSimples, TypeVoyage } from '../domain/types'
import { flexible } from './flexible'
import { stage } from './stage'
import type { DefinitionTypeVoyage } from './types'
import { vacances } from './vacances'
import { weekend } from './weekend'

export type { DefinitionTypeVoyage, IdSectionAvancee, IdSectionSimple, ModeCalcul } from './types'

/** Tous les types de voyage, dans l'ordre d'affichage. */
export const TYPES_VOYAGE: Record<TypeVoyage, DefinitionTypeVoyage> = { vacances, flexible, weekend, stage }
export const LISTE_TYPES_VOYAGE = Object.values(TYPES_VOYAGE)

export const typeVoyage = (s: Pick<ReglagesSimples, 'typeVoyage'>): DefinitionTypeVoyage => TYPES_VOYAGE[s.typeVoyage] ?? vacances

/**
 * Fait respecter les règles du type (durée, logements possibles…) après une modification.
 */
export function harmoniserSimple(s: ReglagesSimples): ReglagesSimples {
  const def = typeVoyage(s)
  let r = { ...s, ...def.harmoniser?.(s) }
  const logements = r.logements.filter((l) => def.logementsPossibles.includes(l))
  if (logements.length === 0) r = { ...r, logements: def.logementsParDefaut(r) }
  else if (logements.length !== r.logements.length) r = { ...r, logements }
  return r
}

/** Passe à un autre type de voyage, avec ses valeurs par défaut. */
export function changerTypeVoyage(s: ReglagesSimples, type: TypeVoyage, aujourdhui: string): ReglagesSimples {
  if (s.typeVoyage === type) return s
  const def = TYPES_VOYAGE[type]
  const r = { ...s, typeVoyage: type, ...def.auChoix({ ...s, typeVoyage: type }, aujourdhui) }
  return harmoniserSimple({ ...r, logements: r.logements.filter((l) => def.logementsPossibles.includes(l)) })
}
