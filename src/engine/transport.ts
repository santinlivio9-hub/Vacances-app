import type { Coordonnees, ModeTransport, ReglagesAvances, ReglagesSimples, Saison } from '../domain/types'
import { comparerTrajets, NOMS_TRAJETS, trajetPourMode, type Fourchette, type OptionTrajet, type ParametresTrajet, type ResultatTrajets } from './trajets'

/** Ce que le moteur sait du trajet (calculé sur la carte). */
export interface DonneesTrajet {
  depart: Coordonnees
  arrivee: Coordonnees
  distanceVolKm: number
  /** Distance par la route (OSRM, ou vol d'oiseau × 1,25) */
  distanceRouteKm: number
  /** Durée en voiture renvoyée par OSRM, si connue */
  dureeRouteMin?: number
  /** Faux s'il n'existe pas de route (mer, autre continent) */
  routeTerrestre: boolean
  /** Noms affichés dans les étapes (« Troyes », « Lyon ») */
  noms?: [string, string]
}

export interface LigneDetail {
  libelle: string
  montant: number
}

export interface EstimationTransport {
  mode: ModeTransport
  possible: boolean
  /** Pourquoi ce mode est impossible ou déconseillé */
  raison?: string
  /** Aller-retour, pour tout le groupe (prix le plus probable) */
  total: number
  /** Fourchette de l'aller-retour */
  fourchette: Fourchette
  /** Durée d'un aller, porte à porte */
  dureeAllerMin: number
  details: LigneDetail[]
  /** Trajet retenu (étapes, prix, liens) */
  option?: OptionTrajet
}

const NOMS_MODES: Record<ModeTransport, string> = { voiture: 'voiture', train: 'train', avion: 'avion', car: 'autocar', covoiturage: 'covoiturage' }

const IMPOSSIBLE = (mode: ModeTransport, raison: string): EstimationTransport => ({ mode, possible: false, raison, total: 0, fourchette: { bas: 0, haut: 0, milieu: 0 }, dureeAllerMin: 0, details: [] })

export type ChoixTrajet = Pick<ReglagesSimples, 'adultes' | 'enfants'> & Partial<Pick<ReglagesSimples, 'nuits' | 'priorite' | 'combinaisons' | 'trajetChoisi'>>
export type AvancesTrajet = ParametresTrajet['av']

/** Comparatif de tous les trajets (simples et combinés) pour ces réglages. */
export function comparatifTrajets(trajet: DonneesTrajet, simple: ChoixTrajet, av: AvancesTrajet, saison: Saison): ResultatTrajets {
  const { noms, ...geo } = trajet
  return comparerTrajets(
    geo,
    {
      adultes: simple.adultes,
      enfants: simple.enfants,
      nuits: simple.nuits ?? 2,
      saison,
      av: {
        vehicules: av.vehicules,
        consommationL100: av.consommationL100,
        prixCarburant: av.prixCarburant,
        peages: av.peages,
        classe: av.classe,
        bagagesSoute: av.bagagesSoute,
        rayonHubMin: av.rayonHubMin ?? 90,
        accesGare: av.accesGare ?? 'parking',
        carteReduction: av.carteReduction ?? 'aucune',
        reservation: av.reservation ?? 'normal',
        usure: av.usure ?? false,
      },
    },
    { priorite: simple.priorite ?? 'compromis', combinaisons: simple.combinaisons ?? true, noms },
  )
}

/**
 * Coût du transport aller-retour pour le groupe, pour un mode : le trajet choisi dans le comparatif
 * s'il est de ce mode, sinon le meilleur trajet de ce mode selon la priorité.
 */
export function estimerTransport(
  mode: ModeTransport,
  trajet: DonneesTrajet,
  simple: ChoixTrajet,
  avances: Pick<ReglagesAvances, 'vehicules' | 'consommationL100' | 'prixCarburant' | 'peages' | 'classe' | 'bagagesSoute'> & Partial<AvancesTrajet>,
  saison: Saison,
): EstimationTransport {
  const r = comparatifTrajets(trajet, simple, avances as AvancesTrajet, saison)
  const option = trajetPourMode(r, mode, simple.trajetChoisi ?? null)
  if (!option) {
    const raison = r.ecartees.find((e) => (e.type === 'autocar' ? 'car' : e.type.split('+').includes(mode) ? mode : null) === mode)?.raison
    return IMPOSSIBLE(mode, raison ?? impossibleParDefaut(mode, trajet))
  }
  return {
    mode,
    possible: true,
    raison: option.peuRealiste,
    total: option.total.milieu,
    fourchette: option.total,
    dureeAllerMin: option.dureeAllerMin,
    details: option.details,
    option,
  }
}

function impossibleParDefaut(mode: ModeTransport, trajet: DonneesTrajet): string {
  if (!trajet.routeTerrestre && mode !== 'avion') return `Pas de liaison terrestre : impossible en ${NOMS_MODES[mode]}.`
  if (mode === 'avion') return trajet.distanceVolKm < 400 ? 'Moins de 400 km : pas de vol régulier, prenez plutôt le train ou la voiture.' : 'Aucun aéroport dans le rayon choisi : augmentez le temps d’accès à l’aéroport.'
  if (mode === 'train') return 'Aucune gare utile dans le rayon choisi, ou trajet trop long en train.'
  if (mode === 'car') return 'Pas de ligne d’autocar connue près du départ ou de l’arrivée.'
  return `Trajet impossible en ${NOMS_MODES[mode]}.`
}

export const MODES: ModeTransport[] = ['voiture', 'train', 'avion', 'car', 'covoiturage']
export { NOMS_TRAJETS }
