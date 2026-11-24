import { useMemo } from 'react'
import { useItineraire } from '../carte/hooks'
import { itineraireProvisoire, versDonneesTrajet, type ItineraireCarte } from '../carte/itineraire'
import { estimerCouts, type EstimationCouts } from '../engine/couts'
import { reglagesEffectifs } from '../engine/reglages'
import { estimerTransport, MODES, type DonneesTrajet, type EstimationTransport } from '../engine/transport'
import type { ModeTransport } from '../domain/types'
import { useVoyage } from '../store/voyage'

export interface Estimation {
  itineraire: ItineraireCarte
  /** Vrai tant qu'OSRM n'a pas répondu */
  provisoire: boolean
  trajet: DonneesTrajet
  couts: EstimationCouts
  parMode: Record<ModeTransport, EstimationTransport>
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
    const couts = estimerCouts({ trajet, arrivee, reglages })
    const av = reglagesEffectifs(reglages)
    const parMode = Object.fromEntries(
      MODES.map((m) => [m, estimerTransport(m, trajet, reglages.simple, av, couts.saison)]),
    ) as Record<ModeTransport, EstimationTransport>
    return { itineraire, provisoire, trajet, couts, parMode }
  }, [depart, arrivee, reglages, etat])
}
