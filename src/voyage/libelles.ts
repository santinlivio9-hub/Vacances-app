import type { Poste } from '../engine/couts'
import type { TypeActivite } from '../domain/types'

export const POSTES_UI: Record<Poste, { libelle: string; couleur: string }> = {
  transport: { libelle: 'Transport', couleur: 'var(--poste-transport)' },
  logement: { libelle: 'Logement', couleur: 'var(--poste-logement)' },
  repas: { libelle: 'Repas', couleur: 'var(--poste-repas)' },
  activites: { libelle: 'Activités', couleur: 'var(--poste-activites)' },
  transportLocal: { libelle: 'Sur place', couleur: 'var(--poste-transport-local)' },
  divers: { libelle: 'Divers', couleur: 'var(--poste-divers)' },
  imprevus: { libelle: 'Imprévus', couleur: 'var(--poste-imprevus)' },
}

/** Couleur de chaque jour sur la carte (palette catégorielle, cyclique). */
export const COULEURS_JOURS = ['#2a78d6', '#eb6834', '#1baf7a', '#c98500', '#d55181', '#8a63d2', '#0f9fb5', '#7d6b4f']

export const TYPES_ACTIVITE_UI: Record<TypeActivite, string> = {
  musee: 'Musée',
  monument: 'Monument',
  parc: 'Parc',
  plage: 'Plage',
  point_de_vue: 'Point de vue',
  zoo: 'Zoo',
  parc_attractions: 'Parc d’attractions',
  visite_guidee: 'Visite',
  nature: 'Nature',
  spectacle: 'Spectacle',
  marche: 'Marché',
  autre: 'À découvrir',
}

export const dateCourte = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
