import type { ReglagesAvances, ReglagesSimples, TypeLogement, TypeVoyage } from '../domain/types'

/** Cartes de la configuration en mode Simple. */
export type IdSectionSimple = 'quand' | 'periode' | 'stage' | 'qui' | 'comment' | 'style' | 'logements' | 'interets' | 'budget'
/** Cartes supplémentaires (ou retirées) du mode Avancé. */
export type IdSectionAvancee = 'transport' | 'logement' | 'repas' | 'activites' | 'divers' | 'sejour'

/**
 * Façon de calculer :
 * - itinéraire : un voyage à dates fixes, jour par jour ;
 * - périodes : on teste plusieurs mois et durées, puis on garde les moins chers ;
 * - séjour long : un budget par mois autour d'un lieu de travail.
 */
export type ModeCalcul = 'itineraire' | 'periodes' | 'sejourLong'

/**
 * Déclaration d'un type de voyage. Pour en ajouter un : créer un fichier qui exporte
 * une `DefinitionTypeVoyage`, puis l'ajouter à `TYPES_VOYAGE` dans `index.ts`.
 */
export interface DefinitionTypeVoyage {
  id: TypeVoyage
  nom: string
  /** Une ligne sous le nom, sur la carte de choix */
  accroche: string
  calcul: ModeCalcul
  /** Nom du point d'arrivée (« Lieu de travail » pour un stage) */
  libelleArrivee: string
  sectionsSimples: IdSectionSimple[]
  sectionsAvancees: IdSectionAvancee[]
  /** Types de logement qu'on peut cocher */
  logementsPossibles: TypeLogement[]
  logementsParDefaut: (s: ReglagesSimples) => TypeLogement[]
  /** Valeurs posées quand on choisit ce type */
  auChoix: (s: ReglagesSimples, aujourdhui: string) => Partial<ReglagesSimples>
  /** Contraintes réappliquées après chaque modification (ex. 1 ou 2 nuits pour un week-end) */
  harmoniser?: (s: ReglagesSimples) => Partial<ReglagesSimples>
  /** Réglages avancés propres au type (s'ajoutent aux valeurs déduites du mode Simple) */
  avancesParDefaut?: (s: ReglagesSimples) => Partial<ReglagesAvances>
}
