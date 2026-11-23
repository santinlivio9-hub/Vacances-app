import type { Destination, Saison } from '../data/types'
import { moisDe } from './dates'

export function saisonDuMois(destination: Destination, mois: number): Saison {
  if (destination.moisHauteSaison.includes(mois)) return 'haute'
  if (destination.moisBasseSaison.includes(mois)) return 'basse'
  return 'moyenne'
}

/** Saison forcée si elle est donnée, sinon déduite du mois de départ, sinon moyenne saison. */
export function saisonDuVoyage(destination: Destination, dateDepart?: string, saisonForcee?: Saison): Saison {
  if (saisonForcee) return saisonForcee
  if (dateDepart) return saisonDuMois(destination, moisDe(dateDepart))
  return 'moyenne'
}
