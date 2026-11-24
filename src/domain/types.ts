/** Types partagés par les données, les services, le moteur et l'interface. */

export interface Coordonnees {
  lat: number
  lon: number
}

/** Un point choisi sur la carte (adresse, ville, lieu…). */
export interface Lieu extends Coordonnees {
  /** Nom court : « Lisbonne », « 12 rue de la Paix » */
  nom: string
  /** Précision : « Lisbonne, Portugal » */
  detail: string
  /** Code pays ISO 3166-1 alpha-2 en minuscules (« fr », « pt »), si connu */
  pays?: string
  /** Code postal, si connu (sert aux liens de réservation) */
  codePostal?: string
  /** Type renvoyé par le service (city, street, house…), à titre indicatif */
  type?: string
}

export type ModeTransport = 'voiture' | 'train' | 'avion' | 'car'
export type Style = 'eco' | 'equilibre' | 'confort'
export type Saison = 'basse' | 'moyenne' | 'haute'
export type Interet = 'culture' | 'nature' | 'plage' | 'gastronomie' | 'sport' | 'fete' | 'detente' | 'shopping'

export type TypeLogement = 'hotel' | 'appartement' | 'auberge' | 'camping'
export type TransportLocal = 'transports' | 'voiture' | 'velo' | 'pied'
export type ClasseVoyage = 'eco' | 'premium' | 'premiere'
export type Rythme = 1 | 2 | 3
export type NiveauResto = 'simple' | 'moyen' | 'gastronomique'
export type Quartier = 'centre' | 'calme'

/** Les quelques questions du mode Simple. */
export interface ReglagesSimples {
  /** AAAA-MM-JJ */
  dateDepart: string
  nuits: number
  adultes: number
  enfants: number
  transport: ModeTransport
  style: Style
  interets: Interet[]
  /** Budget total en euros ; null = pas de limite */
  budget: number | null
}

/** Tous les réglages détaillés du mode Avancé. Leurs valeurs par défaut sont déduites des réglages simples. */
export interface ReglagesAvances {
  // Transport
  vehicules: number
  consommationL100: number
  prixCarburant: number
  peages: boolean
  classe: ClasseVoyage
  bagagesSoute: boolean
  transportLocal: TransportLocal
  // Logement
  typeLogement: TypeLogement
  etoiles: 2 | 3 | 4
  chambres: number
  petitDejeuner: boolean
  quartier: Quartier
  // Repas
  partRestaurant: number // 0 à 1
  restosParJour: number // 0 à 3
  niveauResto: NiveauResto
  // Activités
  rythme: Rythme
  gratuitesUniquement: boolean
  budgetMaxActivite: number | null
  activitesIncluses: string[]
  activitesExclues: string[]
  tempsLibre: boolean
  // Budget et divers
  repartition: RepartitionBudget
  tauxImprevus: number // 0 à 0,3
  assurance: boolean
  souvenirs: boolean
}

/** Répartition du budget entre postes, en parts dont la somme vaut 1. */
export interface RepartitionBudget {
  transport: number
  logement: number
  repas: number
  activites: number
}

export type CleAvancee = keyof ReglagesAvances

/** Réglages d'un voyage : les simples + uniquement les valeurs avancées modifiées à la main. */
export interface Reglages {
  simple: ReglagesSimples
  modifies: Partial<ReglagesAvances>
}

/** Un lieu à visiter trouvé autour de la destination. */
export type TypeActivite =
  | 'musee'
  | 'monument'
  | 'parc'
  | 'plage'
  | 'point_de_vue'
  | 'zoo'
  | 'parc_attractions'
  | 'visite_guidee'
  | 'nature'
  | 'spectacle'
  | 'marche'
  | 'autre'

export interface LieuVisite extends Coordonnees {
  id: string
  nom: string
  type: TypeActivite
  /** « fr:Tour Eiffel » (tag OSM) ou titre Wikipédia */
  wikipedia?: string
  wikidata?: string
  site?: string
  /** Tags OSM utiles (frais d'entrée, horaires…) */
  gratuit?: boolean
  source: 'osm' | 'wikipedia' | 'generique'
}

export interface ResumeWikipedia {
  titre: string
  extrait: string
  image?: string
  lien: string
  langue: 'fr' | 'en'
}

export interface Trajet {
  distanceKm: number
  dureeMin: number
  /** Points du tracé [lat, lon] */
  trace: [number, number][]
  /** Vrai si calculé à vol d'oiseau faute de réponse du service de routage */
  approximatif: boolean
}
