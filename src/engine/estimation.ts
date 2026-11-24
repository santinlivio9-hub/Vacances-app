import { typeVoyage } from '../tripTypes'
import { estimerCouts, type EntreeCouts, type EstimationCouts } from './couts'
import { meilleuresPeriodes, nomPeriode, type ResultatPeriodes } from './periodes'
import { budgetSejourLong, type BudgetSejourLong } from './sejourLong'

const euros = (v: number) => `${Math.round(v).toLocaleString('fr-FR')} €`

export interface EstimationEnDirect {
  couts: EstimationCouts
  /** Montant affiché : total des dépenses (séjour long : mois × dépenses mensuelles + frais ponctuels) */
  total: number
  parPersonne: number
  /** Prix bas et prix haut autour du total */
  fourchette: { bas: number; haut: number }
  /** « Estimation », « À partir de (avril 2027) », « Séjour complet » */
  libelle: string
  /** Précision sous le total (« 1 274 €/mois + 431 € de frais ») */
  precision?: string
  periodes?: ResultatPeriodes
  sejourLong?: BudgetSejourLong
}

/**
 * Estimation d'un voyage selon son type. C'est la même fonction pour la barre du bas de la
 * configuration et pour l'en-tête de « Mon voyage » d'un séjour long : mêmes réglages, même total.
 */
export function estimationEnDirect(entree: EntreeCouts, aujourdhui: string): EstimationEnDirect {
  const couts = estimerCouts(entree)
  const s = entree.reglages.simple
  const calcul = typeVoyage(s).calcul
  if (calcul === 'sejourLong') {
    const b = budgetSejourLong(entree)
    return { couts, sejourLong: b, total: b.total, fourchette: { bas: b.total * 0.88, haut: b.total * 1.15 }, parPersonne: b.parPersonne, libelle: 'Séjour complet', precision: `${euros(b.totalMensuel)}/mois + ${euros(b.fraisPonctuels)} de frais` }
  }
  if (calcul === 'periodes') {
    const periodes = meilleuresPeriodes(entree, aujourdhui)
    const m = periodes.meilleures[0]
    const r = (v: number) => (couts.total > 0 ? (v / couts.total) * m?.total : 0)
    if (m) return { couts, periodes, total: m.total, fourchette: { bas: r(couts.fourchette.bas), haut: r(couts.fourchette.haut) }, parPersonne: m.total / (s.adultes + s.enfants), libelle: `À partir de (${nomPeriode(m)})`, precision: `${m.nuits} nuits` }
  }
  return { couts, total: couts.total, fourchette: couts.fourchette, parPersonne: couts.parPersonne, libelle: 'Estimation' }
}
