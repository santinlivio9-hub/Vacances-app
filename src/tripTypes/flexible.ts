import type { DefinitionTypeVoyage } from './types'
import { vacances } from './vacances'

export const flexible: DefinitionTypeVoyage = {
  ...vacances,
  id: 'flexible',
  nom: 'Dates flexibles',
  accroche: 'Une durée souple : on cherche les périodes les moins chères',
  calcul: 'periodes',
  sectionsSimples: ['periode', 'qui', 'comment', 'style', 'logements', 'interets', 'budget'],
  auChoix: (s) => ({ nuits: s.flexible.dureeMin }),
  harmoniser: (s) => {
    const dureeMin = Math.max(1, Math.min(s.flexible.dureeMin, 60))
    const dureeMax = Math.max(dureeMin, Math.min(s.flexible.dureeMax, 60))
    return { flexible: { ...s.flexible, dureeMin, dureeMax }, nuits: dureeMin }
  },
}
