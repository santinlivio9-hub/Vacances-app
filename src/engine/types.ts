import type { Aeroport, Confort, Destination, LieuDepart, ModeTransport, Saison } from '../data/types'

export interface ParametresVoyage {
  destination: Destination
  depart: LieuDepart
  /** Nombre de voyageurs (entier ≥ 1) */
  personnes: number
  /** Nombre de nuits (entier ≥ 1) */
  nuits: number
  confort: Confort
  /** Mode de transport souhaité ; s'il est impossible, le moins cher des modes possibles est retenu */
  mode: ModeTransport
  /** Date de départ AAAA-MM-JJ, sert à déduire la saison et à pré-remplir les liens */
  dateDepart?: string
  /** Saison forcée ; sinon déduite du mois de départ (moyenne saison sans date) */
  saison?: Saison
  /** Part des imprévus, entre 0 et 1 (0,10 par défaut) */
  tauxImprevus?: number
  /** Indices des activités suggérées cochées */
  activitesChoisies?: number[]
  /** Nombre de chambres ; par défaut une chambre pour deux */
  chambres?: number
}

export type Poste = 'transport' | 'logement' | 'repas' | 'activites' | 'transportLocal' | 'imprevus'
export type Postes = Record<Poste, number>

export interface OptionTransport {
  mode: ModeTransport
  disponible: boolean
  /** Pourquoi ce mode est impossible */
  raison?: string
  /** Coût aller-retour pour tout le groupe, en € (0 si indisponible) */
  cout: number
  /** Distance d'un trajet : route ou rail (vol d'oiseau × détour), ou vol d'oiseau pour l'avion */
  distanceKm: number
  /** Voiture : nombre de véhicules */
  vehicules?: number
  /** Train et avion : prix aller-retour par personne */
  prixParPersonne?: number
  /** Avion : aéroport de départ et trajet pour s'y rendre (km, aller simple) */
  aeroportDepart?: Aeroport
  accesAeroportKm?: number
}

export interface ResultatVoyage {
  total: number
  parPersonne: number
  postes: Postes
  saison: Saison
  /** Jours de dépenses sur place (un par nuit) */
  jours: number
  chambres: number
  /** Mode réellement retenu (null si aucun n'est possible) */
  transport: OptionTransport | null
  avertissements: string[]
}
