import { destinations as toutesLesDestinations } from '../data'
import type { Confort, Destination } from '../data/types'
import { calculerVoyage, TAUX_IMPREVUS_PAR_DEFAUT } from './calculerVoyage'
import { CONTEXTE_PAR_DEFAUT, type ContexteCalcul } from './contexte'
import type { ParametresVoyage, ResultatVoyage } from './types'

/** Enveloppes du mode budget ; « activites » couvre aussi les déplacements sur place. */
export type PosteBudget = 'transport' | 'logement' | 'repas' | 'activites' | 'imprevus'
export type Enveloppes = Record<PosteBudget, number>

/** Répartition par défaut du budget hors imprévus. */
export const REPARTITION_PAR_DEFAUT = { logement: 0.35, transport: 0.25, repas: 0.25, activites: 0.15 } as const

export interface RepartitionBudget {
  enveloppes: Enveloppes
  /** Coût du transport réellement calculé pour ce voyage */
  transportCalcule: number
  /** Faux si le transport seul dépasse le budget disponible */
  suffisant: boolean
}

function verifierBudget(budget: number) {
  if (!Number.isFinite(budget) || budget <= 0) throw new RangeError(`Le budget doit être un montant positif (reçu : ${budget})`)
}

/**
 * Propose une enveloppe par poste. Les imprévus sont mis de côté d'abord ; le transport reçoit
 * son coût réel au lieu des 25 % par défaut ; le reste est partagé entre logement, repas et
 * activités dans les proportions par défaut (35 / 25 / 15).
 */
export function repartirBudget(
  budget: number,
  params: ParametresVoyage,
  contexte: ContexteCalcul = CONTEXTE_PAR_DEFAUT,
): RepartitionBudget {
  verifierBudget(budget)
  const taux = params.tauxImprevus ?? TAUX_IMPREVUS_PAR_DEFAUT
  const imprevus = Math.round(budget - budget / (1 + taux))
  const disponible = budget - imprevus
  const transportCalcule = calculerVoyage(params, contexte).postes.transport
  const reste = Math.max(0, disponible - transportCalcule)

  const { logement, repas, activites } = REPARTITION_PAR_DEFAUT
  const poids = logement + repas + activites
  const enveloppeRepas = Math.round((reste * repas) / poids)
  const enveloppeActivites = Math.round((reste * activites) / poids)

  return {
    enveloppes: {
      transport: transportCalcule,
      // le logement absorbe les arrondis pour que la somme tombe juste
      logement: reste - enveloppeRepas - enveloppeActivites,
      repas: enveloppeRepas,
      activites: enveloppeActivites,
      imprevus,
    },
    transportCalcule,
    suffisant: transportCalcule <= disponible,
  }
}

export type StatutBudget = 'large' | 'juste' | 'depasse'

export interface Compatibilite {
  destination: Destination
  /** Meilleur confort qui tient dans le budget, ou « eco » si rien ne tient */
  confort: Confort
  resultat: ResultatVoyage
  /** Budget − total : positif = marge restante, négatif = dépassement */
  marge: number
  statut: StatutBudget
}

/** Au moins 10 % de marge : « large » ; entre 0 et 10 % : « juste » ; sinon « depasse ». */
export const SEUIL_MARGE_LARGE = 0.1

const CONFORTS_DU_MEILLEUR: Confort[] = ['confort', 'moyen', 'eco']
const ORDRE_STATUT: Record<StatutBudget, number> = { large: 0, juste: 1, depasse: 2 }
const RANG_CONFORT: Record<Confort, number> = { confort: 0, moyen: 1, eco: 2 }

export function statutBudget(budget: number, marge: number): StatutBudget {
  if (marge < 0) return 'depasse'
  return marge >= budget * SEUIL_MARGE_LARGE ? 'large' : 'juste'
}

/**
 * Pour chaque destination : le meilleur niveau de confort qui tient dans le budget, avec la marge.
 * Tri : ce qui passe largement, puis juste, puis ce qui dépasse ; à statut égal, le meilleur
 * confort d'abord, puis la plus grande marge (ou le plus petit dépassement).
 */
export function destinationsCompatibles(
  budget: number,
  params: Omit<ParametresVoyage, 'destination' | 'confort'>,
  destinations: Destination[] = toutesLesDestinations,
  contexte: ContexteCalcul = CONTEXTE_PAR_DEFAUT,
): Compatibilite[] {
  verifierBudget(budget)
  return destinations
    .map((destination) => {
      const essais = CONFORTS_DU_MEILLEUR.map((confort) => ({
        confort,
        resultat: calculerVoyage({ ...params, destination, confort }, contexte),
      }))
      const retenu = essais.find((e) => e.resultat.total <= budget) ?? essais[essais.length - 1]
      const marge = budget - retenu.resultat.total
      return { destination, confort: retenu.confort, resultat: retenu.resultat, marge, statut: statutBudget(budget, marge) }
    })
    .sort(
      (a, b) =>
        ORDRE_STATUT[a.statut] - ORDRE_STATUT[b.statut] || RANG_CONFORT[a.confort] - RANG_CONFORT[b.confort] || b.marge - a.marge,
    )
}
