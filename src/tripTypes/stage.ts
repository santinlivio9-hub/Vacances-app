import type { DefinitionTypeVoyage } from './types'
import { LOGEMENTS_LONGS } from '../engine/logements'
import { ajouterJours, lireDate } from '../engine/dates'

const JOUR_MS = 86_400_000
/** Nombre de nuits entre deux dates AAAA-MM-JJ */
export const nuitsEntre = (debut: string, fin: string) => Math.round((lireDate(fin).getTime() - lireDate(debut).getTime()) / JOUR_MS)

export const stage: DefinitionTypeVoyage = {
  id: 'stage',
  nom: 'Stage / séjour long',
  accroche: 'Plusieurs semaines près d’un lieu de travail, budget au mois',
  calcul: 'sejourLong',
  libelleArrivee: 'Lieu de travail',
  sectionsSimples: ['stage', 'qui', 'comment', 'style', 'logements', 'budget'],
  sectionsAvancees: ['sejour', 'transport', 'logement', 'divers'],
  logementsPossibles: LOGEMENTS_LONGS,
  logementsParDefaut: () => ['colocation', 'studio'],
  auChoix: (s) => {
    const dateFin = s.stage.dateFin > s.dateDepart ? s.stage.dateFin : ajouterJours(s.dateDepart, 70)
    return { adultes: 1, enfants: 0, stage: { ...s.stage, dateFin }, interets: s.interets }
  },
  harmoniser: (s) => {
    // Au moins 2 semaines, au plus un an
    let dateFin = s.stage.dateFin
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFin) || nuitsEntre(s.dateDepart, dateFin) < 14) dateFin = ajouterJours(s.dateDepart, 14)
    if (nuitsEntre(s.dateDepart, dateFin) > 366) dateFin = ajouterJours(s.dateDepart, 366)
    const nuits = nuitsEntre(s.dateDepart, dateFin)
    return { nuits, stage: { ...s.stage, dateFin } }
  },
  avancesParDefaut: (s) => ({ rythme: 1, tempsLibre: true, transportLocal: 'transports', assurance: false, bagagesSoute: true, souvenirs: false, quartier: s.style === 'confort' ? 'centre' : 'calme' }),
}

