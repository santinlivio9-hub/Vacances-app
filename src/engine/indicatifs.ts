import type { Confort, Destination } from '../data/types'

/**
 * Coût indicatif sur place, par personne et par jour, en moyenne saison :
 * la moitié d'une chambre double + repas + activités + transport local.
 */
export function prixIndicatifParJour(destination: Destination, confort: Confort = 'moyen'): number {
  return Math.round(
    destination.logement[confort] / 2 + destination.repas[confort] + destination.activites[confort] + destination.transportLocal,
  )
}
