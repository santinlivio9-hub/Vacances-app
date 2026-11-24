import type { DefinitionTypeVoyage } from './types'
import { vacances } from './vacances'
import { ajouterJours, lireDate } from '../engine/dates'

/** Prochain vendredi au moins 2 semaines après aujourd'hui. */
export function prochainVendredi(aujourdhui: string): string {
  let d = ajouterJours(aujourdhui, 14)
  while (lireDate(d).getUTCDay() !== 5) d = ajouterJours(d, 1)
  return d
}

export const weekend: DefinitionTypeVoyage = {
  ...vacances,
  id: 'weekend',
  nom: 'Week-end',
  accroche: '2 ou 3 jours, un trajet court et un programme serré',
  calcul: 'itineraire',
  auChoix: (_s, aujourdhui) => ({ nuits: 2, dateDepart: prochainVendredi(aujourdhui) }),
  harmoniser: (s) => (s.nuits > 2 ? { nuits: 2 } : {}),
  avancesParDefaut: () => ({ rythme: 3, tempsLibre: false, bagagesSoute: false }),
}
