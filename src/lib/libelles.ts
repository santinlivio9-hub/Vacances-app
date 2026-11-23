import type { Confort, ModeTransport, Saison } from '../data/types'
import type { StatutBudget } from '../engine/budget'
import type { Poste } from '../engine/types'

export const MODES: { id: ModeTransport; libelle: string; icone: string }[] = [
  { id: 'voiture', libelle: 'Voiture', icone: '🚗' },
  { id: 'train', libelle: 'Train', icone: '🚆' },
  { id: 'avion', libelle: 'Avion', icone: '✈️' },
]

export const CONFORTS: { id: Confort; libelle: string; detail: string }[] = [
  { id: 'eco', libelle: 'Éco', detail: 'Petits budgets' },
  { id: 'moyen', libelle: 'Moyen', detail: 'Hôtel 3★' },
  { id: 'confort', libelle: 'Confort', detail: 'Hôtel 4★ et +' },
]

export const SAISONS: { id: Saison; libelle: string }[] = [
  { id: 'basse', libelle: 'Basse' },
  { id: 'moyenne', libelle: 'Moyenne' },
  { id: 'haute', libelle: 'Haute' },
]

/**
 * Couleur de chaque poste : palette catégorielle validée (ordre fixe, jamais recyclé),
 * définie en clair et en sombre dans index.css. Les imprévus restent en gris neutre.
 */
export const POSTES: { id: Poste; libelle: string; couleur: string }[] = [
  { id: 'transport', libelle: 'Transport', couleur: 'var(--poste-transport)' },
  { id: 'logement', libelle: 'Logement', couleur: 'var(--poste-logement)' },
  { id: 'repas', libelle: 'Repas', couleur: 'var(--poste-repas)' },
  { id: 'activites', libelle: 'Activités', couleur: 'var(--poste-activites)' },
  { id: 'transportLocal', libelle: 'Transport sur place', couleur: 'var(--poste-transport-local)' },
  { id: 'imprevus', libelle: 'Imprévus', couleur: 'var(--poste-imprevus)' },
]

export const STATUTS: Record<StatutBudget, { libelle: string; icone: string; classeTexte: string; classeFond: string; couleur: string }> = {
  large: {
    libelle: 'Ça passe',
    icone: '✓',
    classeTexte: 'text-(--statut-ok-texte)',
    classeFond: 'bg-(--statut-ok)/15',
    couleur: 'var(--statut-ok)',
  },
  juste: {
    libelle: 'C’est juste',
    icone: '!',
    classeTexte: 'text-(--statut-juste-texte)',
    classeFond: 'bg-(--statut-juste)/20',
    couleur: 'var(--statut-juste)',
  },
  depasse: {
    libelle: 'Hors budget',
    icone: '✕',
    classeTexte: 'text-(--statut-depasse-texte)',
    classeFond: 'bg-(--statut-depasse)/15',
    couleur: 'var(--statut-depasse)',
  },
}

export const libelleMode = (mode: ModeTransport) => MODES.find((m) => m.id === mode)!
export const libelleConfort = (confort: Confort) => CONFORTS.find((c) => c.id === confort)!.libelle

export const MENTION_ESTIMATION = 'Estimation indicative — prix moyens constatés en 2026'
