import type { DefinitionTypeVoyage } from './types'
import { LOGEMENTS_COURTS } from '../engine/logements'

export const vacances: DefinitionTypeVoyage = {
  id: 'vacances',
  nom: 'Vacances',
  accroche: 'Des dates fixes et un programme jour par jour',
  calcul: 'itineraire',
  libelleArrivee: 'Arrivée',
  sectionsSimples: ['quand', 'qui', 'comment', 'style', 'logements', 'interets', 'budget'],
  sectionsAvancees: ['transport', 'logement', 'repas', 'activites', 'divers'],
  logementsPossibles: LOGEMENTS_COURTS,
  logementsParDefaut: (s) => (s.style === 'eco' ? ['appartement', 'auberge'] : s.style === 'confort' ? ['hotel', 'appartement'] : ['hotel', 'appartement']),
  auChoix: (s) => (s.nuits < 3 || s.nuits > 30 ? { nuits: 7 } : {}),
}
