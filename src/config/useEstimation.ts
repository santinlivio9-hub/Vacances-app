import { useMemo } from 'react'
import { useItineraire } from '../carte/hooks'
import { itineraireProvisoire, versDonneesTrajet, type ItineraireCarte } from '../carte/itineraire'
import type { EstimationCouts } from '../engine/couts'
import { estimationEnDirect } from '../engine/estimation'
import type { ResultatPeriodes } from '../engine/periodes'
import { reglagesEffectifs } from '../engine/reglages'
import type { BudgetSejourLong } from '../engine/sejourLong'
import { estimerTransport, MODES, type DonneesTrajet, type EstimationTransport } from '../engine/transport'
import type { ModeTransport } from '../domain/types'
import { dateDuJour, useVoyage } from '../store/voyage'

export interface Estimation {
  itineraire: ItineraireCarte
  /** Vrai tant qu'OSRM n'a pas répondu */
  provisoire: boolean
  trajet: DonneesTrajet
  couts: EstimationCouts
  parMode: Record<ModeTransport, EstimationTransport>
  /** Montant affiché dans la barre du bas, selon le type de voyage */
  total: number
  parPersonne: number
  /** « Estimation », « À partir de (avril 2027) », « Séjour complet » */
  libelle: string
  /** Précision sous le total (« ≈ 1 450 € par mois ») */
  precision?: string
  periodes?: ResultatPeriodes
  sejourLong?: BudgetSejourLong
}

/** Estimation en direct du voyage en cours (null s'il manque le départ ou l'arrivée). */
export function useEstimation(): Estimation | null {
  const { depart, arrivee, reglages } = useVoyage()
  const etat = useItineraire(depart, arrivee)
  return useMemo(() => {
    if (!depart || !arrivee) return null
    const provisoire = etat.statut !== 'ok'
    const itineraire = etat.statut === 'ok' ? etat.valeur : itineraireProvisoire(depart, arrivee)
    const trajet = versDonneesTrajet(depart, arrivee, itineraire)
    const entree = { trajet, arrivee, reglages }
    const e = estimationEnDirect(entree, dateDuJour())
    const av = reglagesEffectifs(reglages)
    const parMode = Object.fromEntries(MODES.map((m) => [m, estimerTransport(m, trajet, reglages.simple, av, e.couts.saison)])) as Record<ModeTransport, EstimationTransport>
    return { itineraire, provisoire, trajet, parMode, ...e }
  }, [depart, arrivee, reglages, etat])
}
