import type { Confort, ModeTransport } from '../data/types'

export const MODES: { id: ModeTransport; libelle: string; icone: string }[] = [
  { id: 'voiture', libelle: 'Voiture', icone: '🚗' },
  { id: 'train', libelle: 'Train', icone: '🚆' },
  { id: 'avion', libelle: 'Avion', icone: '✈️' },
]

export const CONFORTS: { id: Confort; libelle: string }[] = [
  { id: 'eco', libelle: 'Éco' },
  { id: 'moyen', libelle: 'Moyen' },
  { id: 'confort', libelle: 'Confort' },
]

export const MENTION_ESTIMATION = 'Estimation indicative — prix moyens constatés en 2026'
